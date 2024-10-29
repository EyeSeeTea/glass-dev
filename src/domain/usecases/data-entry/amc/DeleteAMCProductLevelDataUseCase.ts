import _ from "lodash";

import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { Future, FutureData } from "../../../entities/Future";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import * as templates from "../../../entities/data-entry/program-templates";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { mapToImportSummary, readTemplate } from "../ImportBLTemplateEventProgram";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { AMCSubstanceDataRepository } from "../../../repositories/data-entry/AMCSubstanceDataRepository";
import { downloadIdsAndDeleteTrackedEntitiesUsingFileBlob } from "../utils/downloadIdsAndDeleteTrackedEntities";
import { getStringFromFileBlob } from "../utils/fileToString";
import { InstanceRepository } from "../../../repositories/InstanceRepository";
import { UseCase } from "../../../../CompositionRoot";
import { AMC_PRODUCT_REGISTER_PROGRAM_ID, AMR_GLASS_AMC_TET_PRODUCT_REGISTER } from "./ImportAMCProductLevelData";

// NOTICE: code adapted for node environment from ImportAMCProductLevelData.ts (only DELETE);
export class DeleteAMCProductLevelDataUseCase implements UseCase {
    constructor(
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceRepository,
        private trackerRepository: TrackerRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private metadataRepository: MetadataRepository,
        private amcSubstanceDataRepository: AMCSubstanceDataRepository
    ) {}

    public execute(
        arrayBuffer: ArrayBuffer,
        eventListId: string | undefined,
        orgUnitId: string,
        calculatedEventListFileId?: string
    ): FutureData<ImportSummary> {
        return this.excelRepository
            .loadTemplateFromArrayBuffer(arrayBuffer, AMC_PRODUCT_REGISTER_PROGRAM_ID)
            .flatMap(_templateId => {
                const amcTemplate = _.values(templates)
                    .map(TemplateClass => new TemplateClass())
                    .filter(t => t.id === "TRACKER_PROGRAM_GENERATED_v3")[0];

                return this.instanceRepository.getProgram(AMC_PRODUCT_REGISTER_PROGRAM_ID).flatMap(amcProgram => {
                    if (!amcTemplate) return Future.error("Cannot find template");

                    return readTemplate(
                        amcTemplate,
                        amcProgram,
                        this.excelRepository,
                        this.instanceRepository,
                        AMC_PRODUCT_REGISTER_PROGRAM_ID
                    ).flatMap(dataPackage => {
                        if (!dataPackage) return Future.error("Cannot find data package");

                        return downloadIdsAndDeleteTrackedEntitiesUsingFileBlob(
                            eventListId,
                            orgUnitId,
                            "DELETE",
                            AMR_GLASS_AMC_TET_PRODUCT_REGISTER,
                            this.glassDocumentsRepository,
                            this.trackerRepository,
                            this.metadataRepository
                        ).flatMap(deleteProductSummary => {
                            if (
                                (deleteProductSummary.status === "SUCCESS" ||
                                    deleteProductSummary.status === "WARNING") &&
                                calculatedEventListFileId
                            ) {
                                return this.deleteCalculatedSubstanceConsumptionData(
                                    deleteProductSummary,
                                    calculatedEventListFileId
                                );
                            }

                            return Future.success(deleteProductSummary);
                        });
                    });
                });
            });
    }

    private deleteCalculatedSubstanceConsumptionData(
        deleteProductSummary: ImportSummary,
        calculatedSubstanceConsumptionListFileId: string
    ) {
        return this.glassDocumentsRepository
            .download(calculatedSubstanceConsumptionListFileId)
            .flatMap(eventListFileBlob => {
                return getStringFromFileBlob(eventListFileBlob).flatMap(_events => {
                    const calculatedConsumptionIds: string[] = JSON.parse(_events);
                    return this.amcSubstanceDataRepository
                        .deleteCalculatedSubstanceConsumptionDataById(calculatedConsumptionIds)
                        .flatMap(deleteCalculatedSubstanceConsumptionResponse => {
                            return mapToImportSummary(
                                deleteCalculatedSubstanceConsumptionResponse,
                                "event",
                                this.metadataRepository
                            ).flatMap(deleteCalculatedSubstanceConsumptionSummary => {
                                return Future.success({
                                    ...deleteCalculatedSubstanceConsumptionSummary.importSummary,
                                    importCount: {
                                        imported:
                                            deleteCalculatedSubstanceConsumptionSummary.importSummary.importCount
                                                .imported + deleteProductSummary.importCount.imported,
                                        updated:
                                            deleteCalculatedSubstanceConsumptionSummary.importSummary.importCount
                                                .updated + deleteProductSummary.importCount.updated,
                                        ignored:
                                            deleteCalculatedSubstanceConsumptionSummary.importSummary.importCount
                                                .ignored + deleteProductSummary.importCount.ignored,
                                        deleted:
                                            deleteCalculatedSubstanceConsumptionSummary.importSummary.importCount
                                                .deleted + deleteProductSummary.importCount.deleted,
                                    },
                                    nonBlockingErrors: [
                                        ...deleteCalculatedSubstanceConsumptionSummary.importSummary.nonBlockingErrors,
                                        ...deleteProductSummary.nonBlockingErrors,
                                    ],
                                    blockingErrors: [
                                        ...deleteCalculatedSubstanceConsumptionSummary.importSummary.blockingErrors,
                                        ...deleteProductSummary.blockingErrors,
                                    ],
                                });
                            });
                        });
                });
            });
    }
}

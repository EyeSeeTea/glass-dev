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
import { AMC_PRODUCT_REGISTER_PROGRAM_ID, AMR_GLASS_AMC_TET_PRODUCT_REGISTER } from "./ImportAMCProductLevelData";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { GlassUploads } from "../../../entities/GlassUploads";
import { Id } from "../../../entities/Ref";
import { AMC_SUBSTANCE_CALCULATED_CONSUMPTION_PROGRAM_ID } from "./ImportAMCSubstanceLevelData";

// NOTICE: code adapted for node environment from ImportAMCProductLevelData.ts (only DELETE)
export class DeleteAMCProductLevelData {
    constructor(
        private options: {
            excelRepository: ExcelRepository;
            instanceRepository: InstanceRepository;
            trackerRepository: TrackerRepository;
            glassDocumentsRepository: GlassDocumentsRepository;
            metadataRepository: MetadataRepository;
            amcSubstanceDataRepository: AMCSubstanceDataRepository;
            glassUploadsRepository: GlassUploadsRepository;
        }
    ) {}

    public delete(arrayBuffer: ArrayBuffer, upload: GlassUploads): FutureData<ImportSummary> {
        const { id: uploadId, calculatedEventListFileId, calculatedEventListDataDeleted } = upload;
        return this.options.excelRepository
            .loadTemplateFromArrayBuffer(arrayBuffer, AMC_PRODUCT_REGISTER_PROGRAM_ID)
            .flatMap(_templateId => {
                const amcTemplate = _.values(templates)
                    .map(TemplateClass => new TemplateClass())
                    .filter(t => t.id === "TRACKER_PROGRAM_GENERATED_v3")[0];

                return this.options.instanceRepository
                    .getProgram(AMC_PRODUCT_REGISTER_PROGRAM_ID)
                    .flatMap(amcProgram => {
                        if (!amcTemplate) return Future.error("Cannot find template");

                        return readTemplate(
                            amcTemplate,
                            amcProgram,
                            this.options.excelRepository,
                            this.options.instanceRepository,
                            AMC_PRODUCT_REGISTER_PROGRAM_ID
                        ).flatMap(dataPackage => {
                            if (!dataPackage) return Future.error("Cannot find data package");

                            return downloadIdsAndDeleteTrackedEntitiesUsingFileBlob(
                                upload,
                                AMC_PRODUCT_REGISTER_PROGRAM_ID,
                                "DELETE",
                                AMR_GLASS_AMC_TET_PRODUCT_REGISTER,
                                this.options.glassDocumentsRepository,
                                this.options.trackerRepository,
                                this.options.metadataRepository,
                                this.options.glassUploadsRepository
                            ).flatMap(deleteProductSummary => {
                                if (
                                    (deleteProductSummary.status === "SUCCESS" ||
                                        deleteProductSummary.status === "WARNING") &&
                                    calculatedEventListFileId &&
                                    !calculatedEventListDataDeleted
                                ) {
                                    return this.deleteCalculatedSubstanceConsumptionData(
                                        uploadId,
                                        deleteProductSummary,
                                        calculatedEventListFileId
                                    );
                                } else {
                                    return Future.success(deleteProductSummary);
                                }
                            });
                        });
                    });
            });
    }

    private deleteCalculatedSubstanceConsumptionData(
        uploadId: Id,
        deleteProductSummary: ImportSummary,
        calculatedSubstanceConsumptionListFileId: string
    ): FutureData<ImportSummary> {
        return this.options.glassDocumentsRepository
            .download(calculatedSubstanceConsumptionListFileId)
            .flatMap(eventListFileBlob => {
                return getStringFromFileBlob(eventListFileBlob).flatMap(_events => {
                    const calculatedConsumptionIds: Id[] = JSON.parse(_events);

                    return this.options.trackerRepository
                        .getExistingEventsIdsByIds(
                            calculatedConsumptionIds,
                            AMC_SUBSTANCE_CALCULATED_CONSUMPTION_PROGRAM_ID
                        )
                        .flatMap(existingEventsIds => {
                            if (!existingEventsIds.length) {
                                return this.options.glassUploadsRepository
                                    .setCalculatedEventListDataDeleted(uploadId)
                                    .flatMap(() => {
                                        return Future.success(deleteProductSummary);
                                    });
                            }

                            return this.options.amcSubstanceDataRepository
                                .deleteCalculatedSubstanceConsumptionDataById(existingEventsIds)
                                .flatMap(deleteCalculatedSubstanceConsumptionResponse => {
                                    return mapToImportSummary(
                                        deleteCalculatedSubstanceConsumptionResponse,
                                        "event",
                                        this.options.metadataRepository
                                    ).flatMap(deleteCalculatedSubstanceConsumptionSummary => {
                                        const mergedSummary: ImportSummary = {
                                            ...deleteCalculatedSubstanceConsumptionSummary.importSummary,
                                            importCount: {
                                                imported:
                                                    deleteCalculatedSubstanceConsumptionSummary.importSummary
                                                        .importCount.imported +
                                                    deleteProductSummary.importCount.imported,
                                                updated:
                                                    deleteCalculatedSubstanceConsumptionSummary.importSummary
                                                        .importCount.updated + deleteProductSummary.importCount.updated,
                                                ignored:
                                                    deleteCalculatedSubstanceConsumptionSummary.importSummary
                                                        .importCount.ignored + deleteProductSummary.importCount.ignored,
                                                deleted:
                                                    deleteCalculatedSubstanceConsumptionSummary.importSummary
                                                        .importCount.deleted + deleteProductSummary.importCount.deleted,
                                                total:
                                                    deleteCalculatedSubstanceConsumptionSummary.importSummary
                                                        .importCount.total + deleteProductSummary.importCount.total,
                                            },
                                            nonBlockingErrors: [
                                                ...deleteCalculatedSubstanceConsumptionSummary.importSummary
                                                    .nonBlockingErrors,
                                                ...deleteProductSummary.nonBlockingErrors,
                                            ],
                                            blockingErrors: [
                                                ...deleteCalculatedSubstanceConsumptionSummary.importSummary
                                                    .blockingErrors,
                                                ...deleteProductSummary.blockingErrors,
                                            ],
                                        };

                                        if (
                                            deleteCalculatedSubstanceConsumptionSummary.importSummary.status ===
                                            "SUCCESS"
                                        ) {
                                            return this.options.glassUploadsRepository
                                                .setCalculatedEventListDataDeleted(uploadId)
                                                .flatMap(() => {
                                                    return Future.success(mergedSummary);
                                                });
                                        } else {
                                            return Future.success(mergedSummary);
                                        }
                                    });
                                });
                        });
                });
            });
    }
}

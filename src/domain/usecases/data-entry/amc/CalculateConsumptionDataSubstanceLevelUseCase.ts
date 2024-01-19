import { Future, FutureData } from "../../../entities/Future";
import { Id } from "../../../entities/Ref";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { AMCSubstanceDataRepository } from "../../../repositories/data-entry/AMCSubstanceDataRepository";
import { mapToImportSummary } from "../ImportBLTemplateEventProgram";
import { getStringFromFile } from "../utils/fileToString";
import { getConsumptionDataSubstanceLevel } from "./utils/getConsumptionDataSubstanceLevel";

const IMPORT_SUMMARY_EVENT_TYPE = "event";
const IMPORT_STRATEGY_CREATE_AND_UPDATE = "CREATE_AND_UPDATE";

export class CalculateConsumptionDataSubstanceLevelUseCase {
    constructor(
        private glassUploadsRepository: GlassUploadsRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private amcSubstanceDataRepository: AMCSubstanceDataRepository,
        private atcRepository: GlassATCRepository,
        private metadataRepository: MetadataRepository
    ) {}

    public execute(uploadId: Id, period: string, orgUnitId: Id, moduleName: string): FutureData<ImportSummary> {
        return this.getEventsIdsFromUploadId(uploadId)
            .flatMap(eventsIds => {
                return Future.joinObj({
                    rawSubstanceConsumptionData:
                        this.amcSubstanceDataRepository.getRawSubstanceConsumptionDataByEventsIds(orgUnitId, eventsIds),
                    atcVersionHistory: this.atcRepository.getAtcHistory(),
                });
            })
            .flatMap(result => {
                const { rawSubstanceConsumptionData, atcVersionHistory } = result;
                return getConsumptionDataSubstanceLevel({
                    orgUnitId,
                    period,
                    atcRepository: this.atcRepository,
                    rawSubstanceConsumptionData,
                    atcVersionHistory,
                }).flatMap(calculatedConsumptionSubstanceLevelData => {
                    if (_.isEmpty(calculatedConsumptionSubstanceLevelData)) {
                        console.error(
                            `Substance level: there are no calculated data to import for orgUnitId=${orgUnitId} and period=${period}`
                        );
                        const errorSummary: ImportSummary = {
                            status: "ERROR",
                            importCount: {
                                ignored: 0,
                                imported: 0,
                                deleted: 0,
                                updated: 0,
                            },
                            nonBlockingErrors: [],
                            blockingErrors: [],
                        };
                        return Future.success(errorSummary);
                    }
                    return this.amcSubstanceDataRepository
                        .importCalculations(
                            IMPORT_STRATEGY_CREATE_AND_UPDATE,
                            orgUnitId,
                            calculatedConsumptionSubstanceLevelData
                        )
                        .flatMap(result => {
                            const { response, eventIdLineNoMap } = result;
                            return mapToImportSummary(
                                response,
                                IMPORT_SUMMARY_EVENT_TYPE,
                                this.metadataRepository,
                                undefined,
                                eventIdLineNoMap
                            ).flatMap(summary => this.uploadIdListFileAndSave(uploadId, summary, moduleName));
                        });
                });
            });
    }

    private getEventsIdsFromUploadId(uploadId: Id): FutureData<string[]> {
        return this.glassUploadsRepository.getEventListFileIdByUploadId(uploadId).flatMap(eventListFileId => {
            return this.glassDocumentsRepository.download(eventListFileId).flatMap(file => {
                return Future.fromPromise(getStringFromFile(file)).flatMap(_events => {
                    const eventIdList: string[] = JSON.parse(_events);
                    return Future.success(eventIdList);
                });
            });
        });
    }

    private uploadIdListFileAndSave(
        uploadId: string,
        summary: { importSummary: ImportSummary; eventIdList: string[] },
        moduleName: string
    ): FutureData<ImportSummary> {
        if (summary.eventIdList.length > 0 && uploadId) {
            const eventListBlob = new Blob([JSON.stringify(summary.eventIdList)], {
                type: "text/plain",
            });
            const calculatedEventListFile = new File([eventListBlob], `${uploadId}_calculatedEventListFileId`);
            return this.glassDocumentsRepository.save(calculatedEventListFile, moduleName).flatMap(fileId => {
                return this.glassUploadsRepository.setCalculatedEventListFileId(uploadId, fileId).flatMap(() => {
                    return Future.success(summary.importSummary);
                });
            });
        } else {
            return Future.success(summary.importSummary);
        }
    }
}

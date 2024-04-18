import { logger } from "../../../../utils/logger";
import { Future, FutureData } from "../../../entities/Future";
import { createAtcVersionKey } from "../../../entities/GlassATC";
import { Id } from "../../../entities/Ref";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { AMCSubstanceDataRepository } from "../../../repositories/data-entry/AMCSubstanceDataRepository";
import { getStringFromFile } from "../utils/fileToString";
import { getConsumptionDataSubstanceLevel } from "./utils/getConsumptionDataSubstanceLevel";

const IMPORT_STRATEGY_CREATE_AND_UPDATE = "CREATE_AND_UPDATE";

export class CalculateConsumptionDataSubstanceLevelUseCase {
    constructor(
        private glassUploadsRepository: GlassUploadsRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private amcSubstanceDataRepository: AMCSubstanceDataRepository,
        private atcRepository: GlassATCRepository
    ) {}

    public execute(uploadId: Id, period: string, orgUnitId: Id, moduleName: string): FutureData<ImportSummary> {
        return this.getEventsIdsFromUploadId(uploadId)
            .flatMap(eventsIds => {
                logger.info(
                    `Calculating consumption data in substance level for ${eventsIds.length} raw substance consumption data`
                );
                logger.debug(
                    `Calculating consumption data in substance level for the following raw substance consumption data (total: ${
                        eventsIds.length
                    }): ${eventsIds.join(", ")}`
                );
                return Future.joinObj({
                    rawSubstanceConsumptionData:
                        this.amcSubstanceDataRepository.getRawSubstanceConsumptionDataByEventsIds(orgUnitId, eventsIds),
                    atcVersionHistory: this.atcRepository.getAtcHistory(),
                });
            })
            .flatMap(result => {
                const { rawSubstanceConsumptionData, atcVersionHistory } = result;
                const atcCurrentVersionInfo = atcVersionHistory.find(({ currentVersion }) => currentVersion);
                if (!atcCurrentVersionInfo) {
                    logger.error(`Cannot find current version of ATC in version history.`);
                    logger.debug(
                        `Cannot find current version of ATC in version history: ${JSON.stringify(atcVersionHistory)}`
                    );
                    return Future.error("Cannot find current version of ATC in version history.");
                }
                const currentAtcVersionKey = createAtcVersionKey(
                    atcCurrentVersionInfo.year,
                    atcCurrentVersionInfo.version
                );
                logger.info(`Current ATC version: ${currentAtcVersionKey}`);
                return this.atcRepository.getAtcVersion(currentAtcVersionKey).flatMap(atcCurrentVersionData => {
                    return getConsumptionDataSubstanceLevel({
                        orgUnitId,
                        period,
                        atcRepository: this.atcRepository,
                        rawSubstanceConsumptionData,
                        currentAtcVersionKey,
                        atcCurrentVersionData,
                    }).flatMap(calculatedConsumptionSubstanceLevelData => {
                        if (_.isEmpty(calculatedConsumptionSubstanceLevelData)) {
                            logger.error(
                                `Substance level: there are no calculated data to import for orgUnitId ${orgUnitId} and period ${period}`
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
                        logger.info(
                            `Creating calculations of substance level data as events for orgUnitId ${orgUnitId} and period ${period}`
                        );
                        return this.amcSubstanceDataRepository
                            .importCalculations(
                                IMPORT_STRATEGY_CREATE_AND_UPDATE,
                                orgUnitId,
                                calculatedConsumptionSubstanceLevelData
                            )
                            .flatMap(result => {
                                const { importSummary, eventIdList } = result;

                                if (importSummary.status === "SUCCESS") {
                                    logger.success(
                                        `Calculations of substance level created for orgUnitId ${orgUnitId} and period ${period}: ${importSummary.importCount.imported} of ${importSummary.importCount.total} events created`
                                    );
                                }
                                if (importSummary.status === "ERROR") {
                                    logger.error(
                                        `Error creating calculations of substance level for orgUnitId ${orgUnitId} and period ${period}: ${JSON.stringify(
                                            importSummary.blockingErrors
                                        )}`
                                    );
                                }
                                if (importSummary.status === "WARNING") {
                                    logger.warn(
                                        `Warning creating calculations of substance level updated for orgUnitId ${orgUnitId} and period ${period}: ${
                                            importSummary.importCount.imported
                                        } of ${
                                            importSummary.importCount.total
                                        } events created and warning=${JSON.stringify(importSummary.warningErrors)}`
                                    );
                                }

                                this.uploadIdListFileAndSave(uploadId, eventIdList, moduleName);
                                return Future.success(importSummary);
                            });
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

    private uploadIdListFileAndSave(uploadId: string, eventIdList: string[], moduleName: string): FutureData<void> {
        if (eventIdList.length > 0 && uploadId) {
            const eventListBlob = new Blob([JSON.stringify(eventIdList)], {
                type: "text/plain",
            });
            const calculatedEventListFile = new File([eventListBlob], `${uploadId}_calculatedEventListFileId`);
            return this.glassDocumentsRepository.save(calculatedEventListFile, moduleName).flatMap(fileId => {
                return this.glassUploadsRepository.setCalculatedEventListFileId(uploadId, fileId).flatMap(() => {
                    return Future.success(undefined);
                });
            });
        }
        return Future.success(undefined);
    }
}

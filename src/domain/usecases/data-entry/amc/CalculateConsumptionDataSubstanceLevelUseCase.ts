import { logger } from "../../../../utils/logger";
import { Future, FutureData } from "../../../entities/Future";
import { CODE_PRODUCT_NOT_HAVE_ATC, createAtcVersionKey } from "../../../entities/GlassAtcVersionData";
import { Id } from "../../../entities/Ref";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassModuleRepository } from "../../../repositories/GlassModuleRepository";
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
        private metadataRepository: MetadataRepository,
        private glassModuleRepository: GlassModuleRepository
    ) {}

    public execute(uploadId: Id, period: string, orgUnitId: Id, moduleName: string): FutureData<ImportSummary> {
        return this.getEventsIdsFromUploadId(uploadId).flatMap(substanceIds => {
            logger.info(
                `[${new Date().toISOString()}] Calculating consumption data in substance level for the following raw substance consumption data (total: ${
                    substanceIds.length
                }): ${substanceIds.join(", ")}`
            );

            return this.glassModuleRepository.getByName(moduleName).flatMap(module => {
                if (!module.chunkSizes?.substanceIds) {
                    logger.error(`[${new Date().toISOString()}] Cannot find substance ids chunk size.`);
                    return Future.error("Cannot find substance ids chunk size.");
                }

                return Future.joinObj({
                    rawSubstanceConsumptionData:
                        this.amcSubstanceDataRepository.getRawSubstanceConsumptionDataByEventsIds(
                            orgUnitId,
                            substanceIds,
                            module.chunkSizes?.substanceIds,
                            true
                        ),
                    atcVersionHistory: this.atcRepository.getAtcHistory(),
                }).flatMap(({ rawSubstanceConsumptionData, atcVersionHistory }) => {
                    const validRawSubstanceConsumptionData = rawSubstanceConsumptionData?.filter(
                        ({ atc_manual }) => atc_manual !== CODE_PRODUCT_NOT_HAVE_ATC
                    );
                    const atcCurrentVersionInfo = atcVersionHistory.find(({ currentVersion }) => currentVersion);
                    if (!atcCurrentVersionInfo) {
                        logger.error(
                            `[${new Date().toISOString()}] Cannot find current version of ATC in version history: ${JSON.stringify(
                                atcVersionHistory
                            )}`
                        );
                        return Future.error("Cannot find current version of ATC in version history.");
                    }
                    const currentAtcVersionKey = createAtcVersionKey(
                        atcCurrentVersionInfo.year,
                        atcCurrentVersionInfo.version
                    );
                    logger.info(`[${new Date().toISOString()}] Current ATC version: ${currentAtcVersionKey}`);
                    return this.atcRepository.getAtcVersion(currentAtcVersionKey).flatMap(atcCurrentVersionData => {
                        return getConsumptionDataSubstanceLevel({
                            orgUnitId,
                            period,
                            atcRepository: this.atcRepository,
                            rawSubstanceConsumptionData: validRawSubstanceConsumptionData,
                            currentAtcVersionKey,
                            atcCurrentVersionData,
                        }).flatMap(calculatedConsumptionSubstanceLevelData => {
                            if (_.isEmpty(calculatedConsumptionSubstanceLevelData)) {
                                logger.error(
                                    `[${new Date().toISOString()}] Substance level: there are no calculated data to import for orgUnitId ${orgUnitId} and period ${period}`
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
                                `[${new Date().toISOString()}] Creating calculations of substance level data as events for orgUnitId ${orgUnitId} and period ${period}`
                            );
                            return this.amcSubstanceDataRepository
                                .importCalculations(
                                    IMPORT_STRATEGY_CREATE_AND_UPDATE,
                                    orgUnitId,
                                    calculatedConsumptionSubstanceLevelData
                                )
                                .flatMap(result => {
                                    const { response, eventIdLineNoMap } = result;
                                    if (response.status === "OK") {
                                        logger.success(
                                            `[${new Date().toISOString()}] Calculations of substance level created for orgUnitId ${orgUnitId} and period ${period}: ${
                                                response.stats.created
                                            } of ${response.stats.total} events created`
                                        );
                                    }
                                    if (response.status === "ERROR") {
                                        logger.error(
                                            `[${new Date().toISOString()}] Error creating calculations of substance level for orgUnitId ${orgUnitId} and period ${period}: ${JSON.stringify(
                                                response.validationReport.errorReports
                                            )}`
                                        );
                                    }
                                    if (response.status === "WARNING") {
                                        logger.warn(
                                            `[${new Date().toISOString()}] Warning creating calculations of substance level for orgUnitId ${orgUnitId} and period ${period}: ${
                                                response.stats.created
                                            } of ${response.stats.total} events created and warning=${JSON.stringify(
                                                response.validationReport.warningReports
                                            )}`
                                        );
                                    }
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

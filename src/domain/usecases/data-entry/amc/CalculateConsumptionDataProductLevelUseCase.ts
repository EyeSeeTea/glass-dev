import { Future, FutureData } from "../../../entities/Future";
import { Id } from "../../../entities/Ref";
import {
    CODE_PRODUCT_NOT_HAVE_ATC,
    COMB_CODE_PRODUCT_NOT_HAVE_ATC,
    createAtcVersionKey,
} from "../../../entities/GlassAtcVersionData";
import { mapToImportSummary } from "../ImportBLTemplateEventProgram";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";
import { InstanceRepository } from "../../../repositories/InstanceRepository";
import { AMCProductDataRepository } from "../../../repositories/data-entry/AMCProductDataRepository";
import { AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID } from "../../../../data/repositories/data-entry/AMCProductDataDefaultRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { getConsumptionDataProductLevel } from "./utils/getConsumptionDataProductLevel";
import { logger } from "../../../../utils/logger";
import { GlassModuleRepository } from "../../../repositories/GlassModuleRepository";
import { AMCSubstanceDataRepository } from "../../../repositories/data-entry/AMCSubstanceDataRepository";
import { RawSubstanceConsumptionCalculated } from "../../../entities/data-entry/amc/RawSubstanceConsumptionCalculated";
import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { mapRawSubstanceCalculatedToSubstanceCalculated } from "./utils/mapRawSubstanceCalculatedToSubstanceCalculated";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { getStringFromFileBlob } from "../utils/fileToString";

const IMPORT_SUMMARY_EVENT_TYPE = "event";
const IMPORT_STRATEGY_CREATE_AND_UPDATE = "CREATE_AND_UPDATE";
const AMR_GLASS_AMC_TEA_ATC = "aK1JpD14imM";
const AMR_GLASS_AMC_TEA_COMBINATION = "mG49egdYK3G";

export class CalculateConsumptionDataProductLevelUseCase {
    constructor(
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceRepository,
        private amcProductDataRepository: AMCProductDataRepository,
        private atcRepository: GlassATCRepository,
        private metadataRepository: MetadataRepository,
        private glassModuleRepository: GlassModuleRepository,
        private amcSubstanceDataRepository: AMCSubstanceDataRepository,
        private glassUploadsRepository: GlassUploadsRepository,
        private glassDocumentsRepository: GlassDocumentsRepository
    ) {}

    public execute(period: string, orgUnitId: Id, moduleName: string, uploadId: Id): FutureData<ImportSummary> {
        return this.getIdsInListUpload(uploadId).flatMap(ids => {
            if (!ids.length) {
                logger.error(`[${new Date().toISOString()}] Products not found.`);
                return Future.error("Products not found.");
            }

            logger.info(
                `[${new Date().toISOString()}] Calculating raw substance consumption data in org unit ${orgUnitId} and period ${period} for the following products (total: ${
                    ids.length
                }): ${ids.join(", ")}`
            );
            return this.glassModuleRepository.getByName(moduleName).flatMap(module => {
                if (!module.chunkSizes?.productIds) {
                    logger.error(`[${new Date().toISOString()}] Cannot find product ids chunk size.`);
                    return Future.error("Cannot find product ids chunk size.");
                }

                return Future.joinObj({
                    productRegisterProgramMetadata: this.amcProductDataRepository.getProductRegisterProgramMetadata(),
                    productDataTrackedEntities:
                        this.amcProductDataRepository.getProductRegisterAndRawProductConsumptionByProductIds(
                            orgUnitId,
                            ids,
                            period,
                            module.chunkSizes?.productIds,
                            true
                        ),
                    atcVersionHistory: this.atcRepository.getAtcHistory(),
                }).flatMap(({ productRegisterProgramMetadata, productDataTrackedEntities, atcVersionHistory }) => {
                    const validProductDataTrackedEntitiesToCalculate = productDataTrackedEntities.filter(
                        ({ attributes }) => {
                            const productWithoutAtcCode = attributes.some(
                                ({ id, value }) =>
                                    (id === AMR_GLASS_AMC_TEA_ATC && value === CODE_PRODUCT_NOT_HAVE_ATC) ||
                                    (id === AMR_GLASS_AMC_TEA_COMBINATION && value === COMB_CODE_PRODUCT_NOT_HAVE_ATC)
                            );
                            return !productWithoutAtcCode;
                        }
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
                    const atcVersionKey = createAtcVersionKey(
                        atcCurrentVersionInfo.year,
                        atcCurrentVersionInfo.version
                    );
                    logger.info(`[${new Date().toISOString()}] Current ATC version: ${atcVersionKey}`);
                    return this.atcRepository.getAtcVersion(atcVersionKey).flatMap(atcCurrentVersionData => {
                        return getConsumptionDataProductLevel({
                            orgUnitId,
                            period,
                            productRegisterProgramMetadata,
                            productDataTrackedEntities: validProductDataTrackedEntitiesToCalculate,
                            atcCurrentVersionData,
                            atcVersionKey,
                        }).flatMap(rawSubstanceConsumptionCalculatedData => {
                            if (_.isEmpty(rawSubstanceConsumptionCalculatedData)) {
                                logger.error(
                                    `[${new Date().toISOString()}] Product level: there are no calculated data to import for orgUnitId ${orgUnitId} and period ${period}`
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

                            const rawSubstanceConsumptionCalculatedStageMetadata =
                                productRegisterProgramMetadata?.programStages.find(
                                    ({ id }) => id === AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID
                                );

                            if (!rawSubstanceConsumptionCalculatedStageMetadata) {
                                logger.error(
                                    `[${new Date().toISOString()}] Cannot find Raw Substance Consumption Calculated program stage metadata with id ${AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID}`
                                );
                                return Future.error(
                                    "Cannot find Raw Substance Consumption Calculated program stage metadata"
                                );
                            }
                            logger.info(
                                `[${new Date().toISOString()}] Creating calculations of product level data as events for orgUnitId ${orgUnitId} and period ${period}`
                            );
                            return this.amcProductDataRepository
                                .importCalculations(
                                    IMPORT_STRATEGY_CREATE_AND_UPDATE,
                                    validProductDataTrackedEntitiesToCalculate,
                                    rawSubstanceConsumptionCalculatedStageMetadata,
                                    rawSubstanceConsumptionCalculatedData,
                                    orgUnitId,
                                    period
                                )
                                .flatMap(importProductResponse => {
                                    if (importProductResponse.status === "OK") {
                                        logger.success(
                                            `[${new Date().toISOString()}] Calculations of product level created for orgUnitId ${orgUnitId} and period ${period}: ${
                                                importProductResponse.stats.created
                                            } of ${importProductResponse.stats.total} events created`
                                        );

                                        return this.importSubstanceConsumptionCalculated(
                                            rawSubstanceConsumptionCalculatedData,
                                            orgUnitId,
                                            period,
                                            importProductResponse,
                                            uploadId,
                                            moduleName
                                        );
                                    }

                                    if (importProductResponse.status === "ERROR") {
                                        logger.error(
                                            `[${new Date().toISOString()}] Error creating calculations of product level for orgUnitId ${orgUnitId} and period ${period}: ${JSON.stringify(
                                                importProductResponse.validationReport.errorReports
                                            )}`
                                        );
                                    }

                                    if (importProductResponse.status === "WARNING") {
                                        logger.warn(
                                            `[${new Date().toISOString()}] Warning creating calculations of product level for orgUnitId ${orgUnitId} and period ${period}: ${
                                                importProductResponse.stats.created
                                            } of ${
                                                importProductResponse.stats.total
                                            } events created and warning=${JSON.stringify(
                                                importProductResponse.validationReport.warningReports
                                            )}`
                                        );

                                        return this.importSubstanceConsumptionCalculated(
                                            rawSubstanceConsumptionCalculatedData,
                                            orgUnitId,
                                            period,
                                            importProductResponse,
                                            uploadId,
                                            moduleName
                                        );
                                    }

                                    return mapToImportSummary(
                                        importProductResponse,
                                        IMPORT_SUMMARY_EVENT_TYPE,
                                        this.metadataRepository
                                    ).flatMap(summary => {
                                        return Future.success(summary.importSummary);
                                    });
                                });
                        });
                    });
                });
            });
        });
    }

    private getIdsInListUpload(uploadId: string): FutureData<Id[]> {
        return this.glassUploadsRepository.getById(uploadId).flatMap(upload => {
            if (!upload?.eventListFileId) {
                logger.error(`[${new Date().toISOString()}] Cannot find upload with id ${uploadId}`);
                return Future.error("Cannot find upload");
            } else {
                return this.glassDocumentsRepository.download(upload.eventListFileId).flatMap(listFileFileBlob => {
                    return getStringFromFileBlob(listFileFileBlob).flatMap(idsList => {
                        const ids: Id[] = JSON.parse(idsList);
                        return Future.success(ids);
                    });
                });
            }
        });
    }

    private importSubstanceConsumptionCalculated(
        rawSubstanceConsumptionCalculatedData: RawSubstanceConsumptionCalculated[],
        orgUnitId: string,
        period: string,
        importProductResponse: TrackerPostResponse,
        uploadId: Id,
        moduleName: string
    ): FutureData<ImportSummary> {
        const calculatedConsumptionSubstanceLevelData = mapRawSubstanceCalculatedToSubstanceCalculated(
            rawSubstanceConsumptionCalculatedData,
            period
        );

        return this.amcSubstanceDataRepository
            .importCalculations(IMPORT_STRATEGY_CREATE_AND_UPDATE, orgUnitId, calculatedConsumptionSubstanceLevelData)
            .flatMap(importSubstancesResult => {
                if (importSubstancesResult.response.status === "OK") {
                    logger.success(
                        `[${new Date().toISOString()}] Calculations of substance level created for orgUnitId ${orgUnitId} and period ${period}: ${
                            importSubstancesResult.response.stats.created
                        } of ${importSubstancesResult.response.stats.total} events created`
                    );
                }
                if (importSubstancesResult.response.status === "ERROR") {
                    logger.error(
                        `[${new Date().toISOString()}] Error creating calculations of substance level for orgUnitId ${orgUnitId} and period ${period}: ${JSON.stringify(
                            importSubstancesResult.response.validationReport.errorReports
                        )}`
                    );
                }
                if (importSubstancesResult.response.status === "WARNING") {
                    logger.warn(
                        `[${new Date().toISOString()}] Warning creating calculations of substance level for orgUnitId ${orgUnitId} and period ${period}: ${
                            importSubstancesResult.response.stats.created
                        } of ${importSubstancesResult.response.stats.total} events created and warning=${JSON.stringify(
                            importSubstancesResult.response.validationReport.warningReports
                        )}`
                    );
                }

                return mapToImportSummary(
                    importSubstancesResult.response,
                    IMPORT_SUMMARY_EVENT_TYPE,
                    this.metadataRepository,
                    undefined,
                    importSubstancesResult.eventIdLineNoMap
                ).flatMap(importSubstancesSummary => {
                    return this.uploadCalculatedIdListFileAndSave(
                        uploadId,
                        importSubstancesSummary,
                        moduleName
                    ).flatMap(importSubstancesSummaryImportSummary => {
                        return mapToImportSummary(
                            importProductResponse,
                            IMPORT_SUMMARY_EVENT_TYPE,
                            this.metadataRepository
                        ).flatMap(importProductSummary => {
                            return Future.success({
                                ...importSubstancesSummaryImportSummary,
                                importCount: {
                                    imported:
                                        importProductSummary.importSummary.importCount.imported +
                                        importSubstancesSummaryImportSummary.importCount.imported,
                                    updated:
                                        importProductSummary.importSummary.importCount.updated +
                                        importSubstancesSummaryImportSummary.importCount.updated,
                                    ignored:
                                        importProductSummary.importSummary.importCount.ignored +
                                        importSubstancesSummaryImportSummary.importCount.ignored,
                                    deleted:
                                        importProductSummary.importSummary.importCount.deleted +
                                        importSubstancesSummaryImportSummary.importCount.deleted,
                                },
                                nonBlockingErrors: [
                                    ...importProductSummary.importSummary.nonBlockingErrors,
                                    ...importSubstancesSummaryImportSummary.nonBlockingErrors,
                                ],
                                blockingErrors: [
                                    ...importProductSummary.importSummary.blockingErrors,
                                    ...importSubstancesSummaryImportSummary.blockingErrors,
                                ],
                            });
                        });
                    });
                });
            });
    }

    private uploadCalculatedIdListFileAndSave(
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

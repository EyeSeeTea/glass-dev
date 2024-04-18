import { Future, FutureData } from "../../../entities/Future";
import { Id } from "../../../entities/Ref";
import { createAtcVersionKey } from "../../../entities/GlassATC";
import { readTemplate } from "../ImportBLTemplateEventProgram";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";
import { InstanceRepository } from "../../../repositories/InstanceRepository";
import { AMCProductDataRepository } from "../../../repositories/data-entry/AMCProductDataRepository";
import {
    AMC_PRODUCT_REGISTER_PROGRAM_ID,
    AMR_GLASS_AMC_TEA_PRODUCT_ID,
    AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID,
} from "../../../../data/repositories/data-entry/AMCProductDataDefaultRepository";
import * as templates from "../../../entities/data-entry/program-templates";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { getConsumptionDataProductLevel } from "./utils/getConsumptionDataProductLevel";
import { logger } from "../../../../utils/logger";

const TEMPLATE_ID = "TRACKER_PROGRAM_GENERATED_v3";

export class CalculateConsumptionDataProductLevelUseCase {
    constructor(
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceRepository,
        private amcProductDataRepository: AMCProductDataRepository,
        private atcRepository: GlassATCRepository,
        private metadataRepository: MetadataRepository
    ) {}

    public execute(period: string, orgUnitId: Id, file: File): FutureData<ImportSummary> {
        return this.getProductIdsFromFile(file)
            .flatMap(productIds => {
                logger.info(
                    `Calculating raw substance consumption data for the following products (total: ${
                        productIds.length
                    }): ${productIds.join(", ")}`
                );
                return Future.joinObj({
                    productRegisterProgramMetadata: this.amcProductDataRepository.getProductRegisterProgramMetadata(),
                    productDataTrackedEntities:
                        this.amcProductDataRepository.getProductRegisterAndRawProductConsumptionByProductIds(
                            orgUnitId,
                            productIds
                        ),
                    atcVersionHistory: this.atcRepository.getAtcHistory(),
                });
            })
            .flatMap(result => {
                const { productRegisterProgramMetadata, productDataTrackedEntities, atcVersionHistory } = result;
                const atcCurrentVersionInfo = atcVersionHistory.find(({ currentVersion }) => currentVersion);
                if (!atcCurrentVersionInfo) {
                    logger.error(`Cannot find current version of ATC in version history.`);
                    logger.debug(
                        `Cannot find current version of ATC in version history: ${JSON.stringify(atcVersionHistory)}`
                    );
                    return Future.error("Cannot find current version of ATC in version history.");
                }
                const atcVersionKey = createAtcVersionKey(atcCurrentVersionInfo.year, atcCurrentVersionInfo.version);
                logger.info(`Current ATC version: ${atcVersionKey}`);
                return this.atcRepository.getAtcVersion(atcVersionKey).flatMap(atcCurrentVersionData => {
                    return getConsumptionDataProductLevel({
                        orgUnitId,
                        period,
                        productRegisterProgramMetadata,
                        productDataTrackedEntities,
                        atcCurrentVersionData,
                        atcVersionKey,
                    }).flatMap(rawSubstanceConsumptionCalculatedData => {
                        if (_.isEmpty(rawSubstanceConsumptionCalculatedData)) {
                            logger.error(
                                `Product level: there are no calculated data to import for orgUnitId ${orgUnitId} and period ${period}`
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
                                `Cannot find Raw Substance Consumption Calculated program stage metadata with id ${AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID}`
                            );
                            return Future.error(
                                "Cannot find Raw Substance Consumption Calculated program stage metadata"
                            );
                        }
                        logger.info(
                            `Creating calculations of product level data as events for orgUnitId ${orgUnitId} and period ${period}`
                        );
                        return this.amcProductDataRepository
                            .importCalculations(
                                "CREATE_AND_UPDATE",
                                productDataTrackedEntities,
                                rawSubstanceConsumptionCalculatedStageMetadata,
                                rawSubstanceConsumptionCalculatedData,
                                orgUnitId,
                                period
                            )
                            .flatMap(importSummary => {
                                if (importSummary.status === "SUCCESS") {
                                    logger.success(
                                        `Calculations of product level created for orgUnitId ${orgUnitId} and period ${period}: ${importSummary.importCount.imported} of ${importSummary.importCount.total} events created`
                                    );
                                }
                                if (importSummary.status === "ERROR") {
                                    logger.error(
                                        `Error creating calculations of product level for orgUnitId ${orgUnitId} and period ${period}: ${JSON.stringify(
                                            importSummary.blockingErrors
                                        )}`
                                    );
                                }
                                if (importSummary.status === "WARNING") {
                                    logger.warn(
                                        `Warning creating calculations of product level updated for orgUnitId ${orgUnitId} and period ${period}: ${
                                            importSummary.importCount.imported
                                        } of ${
                                            importSummary.importCount.total
                                        } events created and warning=${JSON.stringify(importSummary.warningErrors)}`
                                    );
                                }
                                return Future.success(importSummary);
                            });
                    });
                });
            });
    }

    private getProductIdsFromFile(file: File): FutureData<string[]> {
        return this.excelRepository.loadTemplate(file, AMC_PRODUCT_REGISTER_PROGRAM_ID).flatMap(_templateId => {
            const amcTemplate = _.values(templates)
                .map(TemplateClass => new TemplateClass())
                .filter(t => t.id === TEMPLATE_ID)[0];
            return this.instanceRepository.getProgram(AMC_PRODUCT_REGISTER_PROGRAM_ID).flatMap(amcProgram => {
                if (!amcTemplate) {
                    logger.error(`Product level: cannot find template`);
                    return Future.error("Cannot find template");
                }

                return readTemplate(
                    amcTemplate,
                    amcProgram,
                    this.excelRepository,
                    this.instanceRepository,
                    AMC_PRODUCT_REGISTER_PROGRAM_ID
                ).flatMap(amcProductData => {
                    if (!amcProductData) {
                        logger.error(`Product level: cannot find data package`);
                        return Future.error("Cannot find data package");
                    }

                    if (amcProductData.type !== "trackerPrograms") {
                        logger.error(`Product level: incorrect data package`);
                        return Future.error("Incorrect data package");
                    }

                    const productIds = amcProductData.trackedEntityInstances
                        .map(({ attributeValues }) => {
                            return attributeValues.find(
                                ({ attribute }) => attribute.id === AMR_GLASS_AMC_TEA_PRODUCT_ID
                            )?.value;
                        })
                        .filter(Boolean) as string[];

                    return Future.success(productIds);
                });
            });
        });
    }
}

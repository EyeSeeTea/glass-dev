import {
    AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID,
    AMR_GLASS_AMC_TEA_PRODUCT_ID,
} from "../../../../data/repositories/data-entry/AMCProductDataDefaultRepository";
import { GlassATCHistory, createAtcVersionKey } from "../../../entities/GlassATC";
import { Id } from "../../../entities/Ref";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";
import { AMCProductDataRepository } from "../../../repositories/data-entry/AMCProductDataRepository";
import { Future, FutureData } from "../../../entities/Future";
import {
    ProductRegisterProgramMetadata,
    ProgramStage,
    ProgramStageDataElement,
} from "../../../entities/data-entry/amc/ProductRegisterProgram";
import {
    ProductDataTrackedEntity,
    Event,
    EventDataValue,
} from "../../../entities/data-entry/amc/ProductDataTrackedEntity";
import { logger } from "../../../../utils/logger";
import _ from "lodash";
import { getConsumptionDataProductLevel } from "./utils/getConsumptionDataProductLevel";
import {
    RAW_SUBSTANCE_CONSUMPTION_CALCULATED_KEYS,
    RawSubstanceConsumptionCalculated,
} from "../../../entities/data-entry/amc/RawSubstanceConsumptionCalculated";

const IMPORT_STRATEGY_UPDATE = "UPDATE";

export class RecalculateConsumptionDataProductLevelForAllUseCase {
    constructor(
        private amcProductDataRepository: AMCProductDataRepository,
        private atcRepository: GlassATCRepository
    ) {}
    public execute(orgUnitsIds: Id[], periods: string[]): FutureData<void> {
        logger.info(
            `Calculate consumption data of product level for orgUnitsIds=${orgUnitsIds.join(
                ","
            )} and periods=${periods.join(",")}`
        );
        return Future.sequential(
            orgUnitsIds.map(orgUnitId => {
                return Future.sequential(
                    periods.map(period => {
                        return this.calculateByOrgUnitAndPeriod(orgUnitId, period).toVoid();
                    })
                ).toVoid();
            })
        ).toVoid();
    }
    private calculateByOrgUnitAndPeriod(orgUnitId: Id, period: string): FutureData<void> {
        logger.info(`Calculating consumption data of product level for orgUnitsId ${orgUnitId} and period ${period}`);
        return this.getDataForRecalculations(orgUnitId, period).flatMap(data => {
            const {
                productRegisterProgramMetadata,
                productDataTrackedEntities,
                atcVersionHistory,
                currentRawSubstanceConsumptionCalculatedByProductId,
            } = data;
            const atcCurrentVersionInfo = atcVersionHistory.find(({ currentVersion }) => currentVersion);
            if (atcCurrentVersionInfo) {
                const atcVersionKey = createAtcVersionKey(atcCurrentVersionInfo.year, atcCurrentVersionInfo.version);
                logger.info(`New ATC version used in recalculations: ${atcVersionKey}`);
            }
            return getConsumptionDataProductLevel({
                productRegisterProgramMetadata,
                productDataTrackedEntities,
                atcVersionHistory,
                atcRepository: this.atcRepository,
                orgUnitId,
                period,
            }).flatMap(newRawSubstanceConsumptionCalculatedData => {
                if (_.isEmpty(newRawSubstanceConsumptionCalculatedData)) {
                    logger.error(
                        `Product level: there are no new calculated data to update current data for orgUnitId ${orgUnitId} and period ${period}`
                    );
                    return Future.success(undefined);
                }
                const rawSubstanceConsumptionCalculatedStageMetadata =
                    productRegisterProgramMetadata?.programStages.find(
                        ({ id }) => id === AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID
                    );
                if (!rawSubstanceConsumptionCalculatedStageMetadata) {
                    logger.error(
                        `Cannot find Raw Substance Consumption Calculated program stage metadata with id ${AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID}`
                    );
                    return Future.error("Cannot find Raw Substance Consumption Calculated program stage metadata");
                }

                const newRawSubstanceConsumptionCalculatedDataWithIds =
                    linkEventIdToNewRawSubstanceConsumptionCalculated(
                        currentRawSubstanceConsumptionCalculatedByProductId,
                        newRawSubstanceConsumptionCalculatedData
                    );

                const eventIdsToUpdate = newRawSubstanceConsumptionCalculatedDataWithIds.map(({ eventId }) => eventId);
                const eventIdsNoUpdated: Id[] = Object.keys(currentRawSubstanceConsumptionCalculatedByProductId).reduce(
                    (acc: Id[], productId) => {
                        const rawSubstanceConsumptionCalculatedNotToUpdate =
                            currentRawSubstanceConsumptionCalculatedByProductId[productId]?.filter(
                                ({ eventId }) => !eventIdsToUpdate.includes(eventId)
                            );
                        return rawSubstanceConsumptionCalculatedNotToUpdate
                            ? [
                                  ...acc,
                                  ...(rawSubstanceConsumptionCalculatedNotToUpdate.map(
                                      ({ eventId }) => eventId
                                  ) as Id[]),
                              ]
                            : acc;
                    },
                    []
                );
                if (eventIdsNoUpdated.length) {
                    logger.error(`These events could not be updated: events=${eventIdsNoUpdated.join(",")}`);
                }

                logger.debug(
                    `Updating calculations of product level events in DHIS2 for orgUnitId ${orgUnitId} and period ${period}: events=${eventIdsToUpdate.join(
                        ","
                    )}`
                );

                logger.info(
                    `Updating calculations of product level for ${eventIdsToUpdate.length} events in DHIS2 for orgUnitId ${orgUnitId} and period ${period}`
                );
                return this.amcProductDataRepository
                    .importCalculations(
                        IMPORT_STRATEGY_UPDATE,
                        productDataTrackedEntities,
                        rawSubstanceConsumptionCalculatedStageMetadata,
                        newRawSubstanceConsumptionCalculatedDataWithIds,
                        orgUnitId
                    )
                    .flatMap(response => {
                        if (response.status === "OK") {
                            logger.success(
                                `Calculations of product level updated for orgUnitId ${orgUnitId} and period ${period}: ${response.stats.updated} of ${response.stats.total} events updated`
                            );
                        }
                        if (response.status === "ERROR") {
                            logger.error(
                                `Error updating calculations of product level updated for orgUnitId ${orgUnitId} and period ${period}: ${JSON.stringify(
                                    response.validationReport.errorReports
                                )}`
                            );
                        }
                        if (response.status === "WARNING") {
                            logger.warn(
                                `Warning updating calculations of product level updated for orgUnitId ${orgUnitId} and period ${period}: updated=${
                                    response.stats.updated
                                }, total=${response.stats.total} and warning=${JSON.stringify(
                                    response.validationReport.warningReports
                                )}`
                            );
                        }
                        return Future.success(undefined);
                    });
            });
        });
    }

    private getDataForRecalculations(
        orgUnitId: Id,
        period: string
    ): FutureData<{
        productRegisterProgramMetadata: ProductRegisterProgramMetadata | undefined;
        productDataTrackedEntities: ProductDataTrackedEntity[];
        atcVersionHistory: GlassATCHistory[];
        currentRawSubstanceConsumptionCalculatedByProductId: Record<string, RawSubstanceConsumptionCalculated[]>;
    }> {
        logger.info("Getting data for AMC calculations in product level data...");
        return Future.joinObj({
            productRegisterProgramMetadata: this.amcProductDataRepository.getProductRegisterProgramMetadata(),
            productDataTrackedEntities:
                this.amcProductDataRepository.getAllProductRegisterAndRawProductConsumptionByPeriod(orgUnitId, period),
            atcVersionHistory: this.atcRepository.getAtcHistory(),
        }).flatMap(result => {
            const { productRegisterProgramMetadata, productDataTrackedEntities, atcVersionHistory } = result;

            const rawSubstanceConsumptionCalculatedStageMetadata = productRegisterProgramMetadata?.programStages.find(
                ({ id }) => id === AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID
            );
            if (!rawSubstanceConsumptionCalculatedStageMetadata) {
                logger.error(
                    `Cannot find Raw Substance Consumption Calculated program stage metadata with id=${AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID}`
                );
                return Future.error("Cannot find Raw Substance Consumption Calculated program stage metadata");
            }

            const currentRawSubstanceConsumptionCalculatedByProductId: Record<
                string,
                RawSubstanceConsumptionCalculated[]
            > = productDataTrackedEntities.reduce((acc, productDataTrackedEntity) => {
                const productId = productDataTrackedEntity.attributes.find(
                    ({ id }) => id === AMR_GLASS_AMC_TEA_PRODUCT_ID
                )?.value;
                if (!productId) {
                    return acc;
                }

                return {
                    ...acc,
                    [productId]: getCurrentRawSubstanceConsumptionCalculated(
                        productId,
                        productDataTrackedEntity.events,
                        rawSubstanceConsumptionCalculatedStageMetadata
                    ),
                };
            }, {});

            return Future.success({
                productRegisterProgramMetadata,
                productDataTrackedEntities,
                atcVersionHistory,
                currentRawSubstanceConsumptionCalculatedByProductId,
            });
        });
    }
}

function linkEventIdToNewRawSubstanceConsumptionCalculated(
    currentRawSubstanceConsumptionCalculatedByProductId: Record<string, RawSubstanceConsumptionCalculated[]>,
    newRawSubstanceConsumptionCalculatedData: RawSubstanceConsumptionCalculated[]
): RawSubstanceConsumptionCalculated[] {
    return newRawSubstanceConsumptionCalculatedData
        .map(newCalulatedData => {
            const eventIdFound = currentRawSubstanceConsumptionCalculatedByProductId[
                newCalulatedData.AMR_GLASS_AMC_TEA_PRODUCT_ID
            ]?.find(currentCalculatedData => {
                return (
                    currentCalculatedData.atc_autocalculated === newCalulatedData.atc_autocalculated &&
                    currentCalculatedData.route_admin_autocalculated === newCalulatedData.route_admin_autocalculated &&
                    currentCalculatedData.health_sector_autocalculated ===
                        newCalulatedData.health_sector_autocalculated &&
                    currentCalculatedData.health_level_autocalculated ===
                        newCalulatedData.health_level_autocalculated &&
                    currentCalculatedData.data_status_autocalculated === newCalulatedData.data_status_autocalculated
                );
            })?.eventId;

            if (eventIdFound) {
                return {
                    eventId: eventIdFound,
                    ...newCalulatedData,
                };
            }
        })
        .filter(Boolean) as RawSubstanceConsumptionCalculated[];
}

function getCurrentRawSubstanceConsumptionCalculated(
    productId: string,
    events: Event[],
    rawSubstanceConsumptionCalculatedStage: ProgramStage
): RawSubstanceConsumptionCalculated[] {
    return events
        .map(event => {
            const consumptionData = event.dataValues.reduce((acc, eventDataValue: EventDataValue) => {
                const programStageDataElement: ProgramStageDataElement | undefined =
                    rawSubstanceConsumptionCalculatedStage?.dataElements.find(
                        dataElement => dataElement.id === eventDataValue.id
                    );
                if (
                    programStageDataElement &&
                    RAW_SUBSTANCE_CONSUMPTION_CALCULATED_KEYS.includes(programStageDataElement.code)
                ) {
                    switch (programStageDataElement.valueType) {
                        case "TEXT":
                            return {
                                ...acc,
                                [programStageDataElement.code]: programStageDataElement.optionSetValue
                                    ? programStageDataElement.optionSet.options.find(
                                          option => option.code === eventDataValue.value
                                      )?.name
                                    : eventDataValue.value,
                            };
                        case "NUMBER":
                        case "INTEGER":
                        case "INTEGER_POSITIVE":
                        case "INTEGER_ZERO_OR_POSITIVE":
                            return {
                                ...acc,
                                [programStageDataElement.code]: programStageDataElement.optionSetValue
                                    ? programStageDataElement.optionSet.options.find(
                                          option => option.code === eventDataValue.value
                                      )?.name
                                    : parseFloat(eventDataValue.value),
                            };
                        default:
                            return {
                                ...acc,
                                [programStageDataElement.code]: eventDataValue.value,
                            };
                    }
                }
                return acc;
            }, {});
            if (Object.keys(consumptionData).length) {
                return {
                    AMR_GLASS_AMC_TEA_PRODUCT_ID: productId,
                    eventId: event.eventId,
                    ...consumptionData,
                };
            }
        })
        .filter(Boolean) as RawSubstanceConsumptionCalculated[];
}

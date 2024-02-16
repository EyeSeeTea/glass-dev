import _ from "lodash";
import { logger } from "../../../../utils/logger";
import { Id } from "../../../entities/Ref";
import { Future, FutureData } from "../../../entities/Future";
import { GlassATCVersion } from "../../../entities/GlassATC";
import {
    AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID,
    AMR_GLASS_AMC_TEA_PRODUCT_ID,
} from "../../../../data/repositories/data-entry/AMCProductDataDefaultRepository";
import { AMCProductDataRepository } from "../../../repositories/data-entry/AMCProductDataRepository";
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
import {
    RAW_SUBSTANCE_CONSUMPTION_CALCULATED_KEYS,
    RawSubstanceConsumptionCalculated,
} from "../../../entities/data-entry/amc/RawSubstanceConsumptionCalculated";
import { SALT_MAPPING } from "../../../entities/data-entry/amc/Salt";
import { getConsumptionDataProductLevel } from "./utils/getConsumptionDataProductLevel";

const IMPORT_STRATEGY_UPDATE = "UPDATE";
const IMPORT_STRATEGY_CREATE_AND_UPDATE = "CREATE_AND_UPDATE";

export class RecalculateConsumptionDataProductLevelForAllUseCase {
    constructor(private amcProductDataRepository: AMCProductDataRepository) {}
    public execute(
        orgUnitsIds: Id[],
        periods: string[],
        currentATCVersion: string,
        currentATCData: GlassATCVersion,
        allowCreationIfNotExist: boolean
    ): FutureData<void> {
        logger.info(
            `Calculate consumption data of product level for orgUnitsIds=${orgUnitsIds.join(
                ","
            )} and periods=${periods.join(",")}`
        );
        return this.amcProductDataRepository
            .getProductRegisterProgramMetadata()
            .flatMap(productRegisterProgramMetadata => {
                if (!productRegisterProgramMetadata) {
                    logger.error("Product register program metadata not found");
                    return Future.error("Product register program metadata not found");
                }
                return Future.sequential(
                    orgUnitsIds.map(orgUnitId => {
                        return Future.sequential(
                            periods.map(period => {
                                return this.calculateByOrgUnitAndPeriod(
                                    productRegisterProgramMetadata,
                                    orgUnitId,
                                    period,
                                    currentATCData,
                                    currentATCVersion,
                                    allowCreationIfNotExist
                                ).toVoid();
                            })
                        ).toVoid();
                    })
                ).toVoid();
            });
    }
    private calculateByOrgUnitAndPeriod(
        productRegisterProgramMetadata: ProductRegisterProgramMetadata,
        orgUnitId: Id,
        period: string,
        atcCurrentVersionData: GlassATCVersion,
        atcVersionKey: string,
        allowCreationIfNotExist: boolean
    ): FutureData<void> {
        logger.info(`Calculating consumption data of product level for orgUnitsId ${orgUnitId} and period ${period}`);
        return this.getTrackedEntitiesAndRawSubstanceConsumptionCalculatedEvents(
            productRegisterProgramMetadata,
            orgUnitId,
            period
        ).flatMap(data => {
            const { productDataTrackedEntities, currentRawSubstanceConsumptionCalculatedByProductId } = data;
            return getConsumptionDataProductLevel({
                orgUnitId,
                period,
                productRegisterProgramMetadata,
                productDataTrackedEntities,
                atcCurrentVersionData,
                atcVersionKey,
            }).flatMap(newRawSubstanceConsumptionCalculatedData => {
                if (_.isEmpty(newRawSubstanceConsumptionCalculatedData)) {
                    logger.error(
                        `Product level: there are no new calculated data to update current data for orgUnitId ${orgUnitId} and period ${period}`
                    );
                    return Future.success(undefined);
                }

                if (
                    !allowCreationIfNotExist &&
                    (_.isEmpty(currentRawSubstanceConsumptionCalculatedByProductId) ||
                        Object.values(currentRawSubstanceConsumptionCalculatedByProductId || {}).every(
                            rawSubstanceConsumptionCalculated => rawSubstanceConsumptionCalculated.length === 0
                        ))
                ) {
                    logger.error(
                        `Product level: there are no current calculated data to update for orgUnitId ${orgUnitId} and period ${period}`
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

                const rawSubstanceConsumptionCalculatedDataToUpdate =
                    newRawSubstanceConsumptionCalculatedDataWithIds.filter(({ eventId }) => eventId !== undefined);
                const eventIdsToUpdate = rawSubstanceConsumptionCalculatedDataToUpdate.map(({ eventId }) => eventId);

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
                    logger.error(
                        `Product level: these events could not be updated events=${eventIdsNoUpdated.join(",")}`
                    );
                }

                logger.debug(
                    `Updating calculations of product level events in DHIS2 for orgUnitId ${orgUnitId} and period ${period}: events=${eventIdsToUpdate.join(
                        ","
                    )}`
                );

                logger.info(
                    `Updating calculations of product level for ${eventIdsToUpdate.length} events in DHIS2 for orgUnitId ${orgUnitId} and period ${period}`
                );

                const rawSubstanceConsumptionCalculatedDataToCreate =
                    newRawSubstanceConsumptionCalculatedDataWithIds.filter(({ eventId }) => eventId === undefined);

                if (allowCreationIfNotExist && rawSubstanceConsumptionCalculatedDataToCreate.length) {
                    logger.debug(
                        `Creating Raw Substance Consumption Calculated data events in DHIS2 for orgUnitId ${orgUnitId} and period ${period}: events=${JSON.stringify(
                            rawSubstanceConsumptionCalculatedDataToCreate
                        )}`
                    );

                    logger.info(
                        `Creating Raw Substance Consumption Calculated data for ${rawSubstanceConsumptionCalculatedDataToCreate.length} events in DHIS2 for orgUnitId ${orgUnitId} and period ${period}`
                    );
                }

                return this.amcProductDataRepository
                    .importCalculations(
                        allowCreationIfNotExist ? IMPORT_STRATEGY_CREATE_AND_UPDATE : IMPORT_STRATEGY_UPDATE,
                        productDataTrackedEntities,
                        rawSubstanceConsumptionCalculatedStageMetadata,
                        allowCreationIfNotExist
                            ? [
                                  ...rawSubstanceConsumptionCalculatedDataToUpdate,
                                  ...rawSubstanceConsumptionCalculatedDataToCreate,
                              ]
                            : rawSubstanceConsumptionCalculatedDataToUpdate,
                        orgUnitId,
                        period
                    )
                    .flatMap(response => {
                        if (response.status === "OK") {
                            logger.success(
                                `Calculations of product level updated for orgUnitId ${orgUnitId} and period ${period}: ${
                                    response.stats.updated
                                } of ${response.stats.total} events updated${
                                    allowCreationIfNotExist
                                        ? ` and ${response.stats.created} of ${response.stats.total} events created`
                                        : ""
                                }`
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
                                }, ${allowCreationIfNotExist ? `created=${response.stats.created}, ` : ""} total=${
                                    response.stats.total
                                } and warning=${JSON.stringify(response.validationReport.warningReports)}`
                            );
                        }
                        return Future.success(undefined);
                    });
            });
        });
    }

    private getTrackedEntitiesAndRawSubstanceConsumptionCalculatedEvents(
        productRegisterProgramMetadata: ProductRegisterProgramMetadata,
        orgUnitId: Id,
        period: string
    ): FutureData<{
        productDataTrackedEntities: ProductDataTrackedEntity[];
        currentRawSubstanceConsumptionCalculatedByProductId: Record<string, RawSubstanceConsumptionCalculated[]>;
    }> {
        logger.info(
            `Getting product data tracked entities and events in raw substance consumption calculated stage at product level data for period ${period} and organisation unit id ${orgUnitId}`
        );
        return this.amcProductDataRepository
            .getAllProductRegisterAndRawProductConsumptionByPeriod(orgUnitId, period)
            .flatMap(productDataTrackedEntities => {
                const rawSubstanceConsumptionCalculatedStageMetadata =
                    productRegisterProgramMetadata?.programStages.find(
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
                    productDataTrackedEntities,
                    currentRawSubstanceConsumptionCalculatedByProductId,
                });
            });
    }
}

function linkEventIdToNewRawSubstanceConsumptionCalculated(
    currentRawSubstanceConsumptionCalculatedByProductId: Record<string, RawSubstanceConsumptionCalculated[]>,
    newRawSubstanceConsumptionCalculatedData: RawSubstanceConsumptionCalculated[]
): RawSubstanceConsumptionCalculated[] {
    return newRawSubstanceConsumptionCalculatedData.map(newCalulatedData => {
        const eventIdFound = currentRawSubstanceConsumptionCalculatedByProductId[
            newCalulatedData.AMR_GLASS_AMC_TEA_PRODUCT_ID
        ]?.find(currentCalculatedData => {
            return (
                currentCalculatedData.atc_autocalculated === newCalulatedData.atc_autocalculated &&
                currentCalculatedData.route_admin_autocalculated === newCalulatedData.route_admin_autocalculated &&
                (currentCalculatedData.salt_autocalculated === newCalulatedData.salt_autocalculated ||
                    SALT_MAPPING.default === newCalulatedData.salt_autocalculated) &&
                currentCalculatedData.health_sector_autocalculated === newCalulatedData.health_sector_autocalculated &&
                currentCalculatedData.health_level_autocalculated === newCalulatedData.health_level_autocalculated &&
                currentCalculatedData.data_status_autocalculated === newCalulatedData.data_status_autocalculated
            );
        })?.eventId;

        return {
            ...newCalulatedData,
            eventId: eventIdFound ?? undefined,
        };
    });
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
                    ...consumptionData,
                    AMR_GLASS_AMC_TEA_PRODUCT_ID: productId,
                    eventId: event.eventId,
                };
            }
        })
        .filter(Boolean) as RawSubstanceConsumptionCalculated[];
}

import _ from "lodash";
import { logger } from "../../../../utils/logger";
import { Id } from "../../../entities/Ref";
import { Future, FutureData } from "../../../entities/Future";
import {
    CODE_PRODUCT_NOT_HAVE_ATC,
    COMB_CODE_PRODUCT_NOT_HAVE_ATC,
    DEFAULT_SALT_CODE,
    GlassAtcVersionData,
} from "../../../entities/GlassAtcVersionData";
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
import { getConsumptionDataProductLevel } from "./utils/getConsumptionDataProductLevel";
import { AMCSubstanceDataRepository } from "../../../repositories/data-entry/AMCSubstanceDataRepository";
import { mapRawSubstanceCalculatedToSubstanceCalculated } from "./utils/mapRawSubstanceCalculatedToSubstanceCalculated";
import { updateRecalculatedConsumptionData } from "./utils/updateRecalculatedConsumptionData";
import { Maybe } from "../../../../utils/ts-utils";
import consoleLogger from "../../../../utils/consoleLogger";

const IMPORT_STRATEGY_UPDATE = "UPDATE";
const IMPORT_STRATEGY_CREATE_AND_UPDATE = "CREATE_AND_UPDATE";
const AMR_GLASS_AMC_TEA_ATC = "aK1JpD14imM";
const AMR_GLASS_AMC_TEA_COMBINATION = "mG49egdYK3G";

export class RecalculateConsumptionDataProductLevelForAllUseCase {
    constructor(
        private amcProductDataRepository: AMCProductDataRepository,
        private amcSubstanceDataRepository: AMCSubstanceDataRepository
    ) {}
    public execute(
        orgUnitsIds: Id[],
        periods: string[],
        currentATCVersion: string,
        currentATCData: GlassAtcVersionData,
        allowCreationIfNotExist: boolean,
        importCalculationChunkSize: Maybe<number>
    ): FutureData<void> {
        logger.info(
            `[${new Date().toISOString()}] Calculate consumption data of product level for orgUnitsIds=${orgUnitsIds.join(
                ","
            )} and periods=${periods.join(",")}. Current ATC version ${currentATCVersion}`
        );

        return this.amcProductDataRepository
            .getProductRegisterProgramMetadata()
            .flatMap(productRegisterProgramMetadata => {
                if (!productRegisterProgramMetadata) {
                    logger.error(`[${new Date().toISOString()}] Product register program metadata not found`);
                    return Future.error("Product register program metadata not found");
                }

                const allCombinations = orgUnitsIds.flatMap(orgUnitId =>
                    periods.map(period => ({ orgUnitId, period }))
                );

                return Future.sequential(
                    allCombinations.map(({ orgUnitId, period }) => {
                        return Future.fromPromise(new Promise(resolve => setTimeout(resolve, 500))).flatMap(() => {
                            consoleLogger.debug(
                                `[${new Date().toISOString()}] Waiting 500 milliseconds... Processing orgUnit: ${orgUnitId}, period: ${period}`
                            );
                            return this.calculateByOrgUnitAndPeriod(
                                productRegisterProgramMetadata,
                                orgUnitId,
                                period,
                                currentATCData,
                                currentATCVersion,
                                allowCreationIfNotExist,
                                importCalculationChunkSize
                            ).toVoid();
                        });
                    })
                ).toVoid();
            });
    }

    private calculateByOrgUnitAndPeriod(
        productRegisterProgramMetadata: ProductRegisterProgramMetadata,
        orgUnitId: Id,
        period: string,
        atcCurrentVersionData: GlassAtcVersionData,
        atcVersionKey: string,
        allowCreationIfNotExist: boolean,
        importCalculationChunkSize: Maybe<number>
    ): FutureData<void> {
        logger.info(
            `[${new Date().toISOString()}] Calculating consumption data of product level for orgUnitsId ${orgUnitId} and period ${period}`
        );
        return this.getTrackedEntitiesAndRawSubstanceConsumptionCalculatedEvents(
            productRegisterProgramMetadata,
            orgUnitId,
            period
        ).flatMap(data => {
            const { productDataTrackedEntities, currentRawSubstanceConsumptionCalculatedByProductId } = data;

            if (!productDataTrackedEntities || !productDataTrackedEntities?.length) {
                logger.info(
                    `[${new Date().toISOString()}] Product level: there are no product data for orgUnitId ${orgUnitId} and period ${period}`
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
                logger.info(
                    `[${new Date().toISOString()}] Product level: there are no current calculated data to update for orgUnitId ${orgUnitId} and period ${period}`
                );
                return Future.success(undefined);
            }

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
                        `[${new Date().toISOString()}] Product level: there are no new calculated data to update current data for orgUnitId ${orgUnitId} and period ${period}`
                    );
                    return Future.success(undefined);
                }

                const rawSubstanceConsumptionCalculatedStageMetadata =
                    productRegisterProgramMetadata?.programStages.find(
                        ({ id }) => id === AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID
                    );
                if (!rawSubstanceConsumptionCalculatedStageMetadata) {
                    logger.error(
                        `[${new Date().toISOString()}] Cannot find Raw Substance Consumption Calculated program stage metadata with id ${AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID}`
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

                logger.info(
                    `[${new Date().toISOString()}] Updating calculations of product level events in DHIS2 for orgUnitId ${orgUnitId} and period ${period}: events=${eventIdsToUpdate.join(
                        ","
                    )}`
                );

                const rawSubstanceConsumptionCalculatedDataToCreate =
                    newRawSubstanceConsumptionCalculatedDataWithIds.filter(({ eventId }) => eventId === undefined);

                if (allowCreationIfNotExist && rawSubstanceConsumptionCalculatedDataToCreate.length) {
                    logger.info(
                        `[${new Date().toISOString()}] Creating Raw Substance Consumption Calculated data events in DHIS2 for orgUnitId ${orgUnitId} and period ${period}: events=${JSON.stringify(
                            rawSubstanceConsumptionCalculatedDataToCreate
                        )}`
                    );
                }

                const rawSubstanceConsumptionCalculatedDataToImport = allowCreationIfNotExist
                    ? [
                          ...rawSubstanceConsumptionCalculatedDataToUpdate,
                          ...rawSubstanceConsumptionCalculatedDataToCreate,
                      ]
                    : rawSubstanceConsumptionCalculatedDataToUpdate;

                return this.amcProductDataRepository
                    .importCalculations({
                        importStrategy: allowCreationIfNotExist
                            ? IMPORT_STRATEGY_CREATE_AND_UPDATE
                            : IMPORT_STRATEGY_UPDATE,
                        productDataTrackedEntities: productDataTrackedEntities,
                        rawSubstanceConsumptionCalculatedStageMetadata: rawSubstanceConsumptionCalculatedStageMetadata,
                        rawSubstanceConsumptionCalculatedData: rawSubstanceConsumptionCalculatedDataToImport,
                        orgUnitId: orgUnitId,
                        period: period,
                        chunkSize: importCalculationChunkSize,
                    })
                    .flatMap(response => {
                        const eventIdsNoRecalculated: Id[] = Object.keys(
                            currentRawSubstanceConsumptionCalculatedByProductId
                        ).reduce((acc: Id[], productId) => {
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
                        }, []);

                        return this.deleteNoRecalculatedEvents(
                            eventIdsNoRecalculated,
                            importCalculationChunkSize
                        ).flatMap(() => {
                            if (response.status === "OK") {
                                logger.success(
                                    `[${new Date().toISOString()}] Calculations of product level updated for orgUnitId ${orgUnitId} and period ${period}: ${
                                        response.stats.updated
                                    } of ${response.stats.total} events updated${
                                        allowCreationIfNotExist
                                            ? ` and ${response.stats.created} of ${response.stats.total} events created`
                                            : ""
                                    }`
                                );

                                return this.importSubstanceConsumptionCalculated(
                                    rawSubstanceConsumptionCalculatedDataToImport,
                                    orgUnitId,
                                    period,
                                    allowCreationIfNotExist,
                                    importCalculationChunkSize
                                );
                            }
                            if (response.status === "ERROR") {
                                logger.error(
                                    `[${new Date().toISOString()}] Error updating calculations of product level updated for orgUnitId ${orgUnitId} and period ${period}: ${JSON.stringify(
                                        response.validationReport.errorReports
                                    )}`
                                );
                            }

                            if (response.status === "WARNING") {
                                logger.warn(
                                    `[${new Date().toISOString()}] Warning updating calculations of product level updated for orgUnitId ${orgUnitId} and period ${period}: updated=${
                                        response.stats.updated
                                    }, ${allowCreationIfNotExist ? `created=${response.stats.created}, ` : ""} total=${
                                        response.stats.total
                                    } and warning=${JSON.stringify(response.validationReport.warningReports)}`
                                );

                                return this.importSubstanceConsumptionCalculated(
                                    rawSubstanceConsumptionCalculatedDataToImport,
                                    orgUnitId,
                                    period,
                                    allowCreationIfNotExist,
                                    importCalculationChunkSize
                                );
                            }

                            return Future.success(undefined);
                        });
                    });
            });
        });
    }

    private deleteNoRecalculatedEvents(
        eventIdsNoRecalculated: Id[],
        importCalculationChunkSize: Maybe<number>
    ): FutureData<void> {
        if (eventIdsNoRecalculated.length) {
            logger.error(
                `[${new Date().toISOString()}] Product level: these events could not be recalculated so they will be deleted: events=${eventIdsNoRecalculated.join(
                    ","
                )}`
            );

            return this.amcProductDataRepository
                .deleteRawSubstanceConsumptionCalculatedById(eventIdsNoRecalculated, importCalculationChunkSize)
                .flatMap(response => {
                    if (response.status === "OK") {
                        logger.success(
                            `[${new Date().toISOString()}] Product level: no recalculated events deleted=${
                                response.stats.deleted
                            } of ${response.stats.total} events to delete`
                        );
                    }
                    if (response.status === "ERROR") {
                        logger.error(
                            `[${new Date().toISOString()}] Product level: error deleting no recalculated events=${JSON.stringify(
                                response.validationReport.errorReports
                            )}`
                        );
                    }
                    if (response.status === "WARNING") {
                        logger.warn(
                            `[${new Date().toISOString()}] Product level: warning deleting no recalculated events=deleted=${
                                response.stats.deleted
                            }, total=${response.stats.total} and warning=${JSON.stringify(
                                response.validationReport.warningReports
                            )}`
                        );
                    }
                    return Future.success(undefined);
                });
        } else {
            logger.info(`[${new Date().toISOString()}] Product level: all the events were recalculated.`);
            return Future.success(undefined);
        }
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
            `[${new Date().toISOString()}] Getting product data tracked entities and events in raw substance consumption calculated stage at product level data for period ${period} and organisation unit id ${orgUnitId}`
        );
        return this.amcProductDataRepository
            .getAllProductRegisterAndRawProductConsumptionByPeriod(orgUnitId, period)
            .flatMap(productDataTrackedEntities => {
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
                const rawSubstanceConsumptionCalculatedStageMetadata =
                    productRegisterProgramMetadata?.programStages.find(
                        ({ id }) => id === AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID
                    );
                if (!rawSubstanceConsumptionCalculatedStageMetadata) {
                    logger.error(
                        `[${new Date().toISOString()}] Cannot find Raw Substance Consumption Calculated program stage metadata with id=${AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID}`
                    );
                    return Future.error("Cannot find Raw Substance Consumption Calculated program stage metadata");
                }

                const currentRawSubstanceConsumptionCalculatedByProductId: Record<
                    string,
                    RawSubstanceConsumptionCalculated[]
                > = validProductDataTrackedEntitiesToCalculate.reduce((acc, productDataTrackedEntity) => {
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
                    productDataTrackedEntities: validProductDataTrackedEntitiesToCalculate,
                    currentRawSubstanceConsumptionCalculatedByProductId,
                });
            });
    }

    private importSubstanceConsumptionCalculated(
        rawSubstanceConsumptionCalculatedData: RawSubstanceConsumptionCalculated[],
        orgUnitId: string,
        period: string,
        allowCreationIfNotExist: boolean,
        importCalculationChunkSize: Maybe<number>
    ): FutureData<void> {
        const recalculatedSubstanceConsumptionData = mapRawSubstanceCalculatedToSubstanceCalculated(
            rawSubstanceConsumptionCalculatedData,
            period
        );

        return this.amcSubstanceDataRepository
            .getAllCalculatedSubstanceConsumptionDataByByPeriod(orgUnitId, period)
            .flatMap(currentCalculatedConsumptionData => {
                return updateRecalculatedConsumptionData(
                    orgUnitId,
                    period,
                    recalculatedSubstanceConsumptionData,
                    currentCalculatedConsumptionData,
                    this.amcSubstanceDataRepository,
                    allowCreationIfNotExist,
                    importCalculationChunkSize
                );
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
                    DEFAULT_SALT_CODE === newCalulatedData.salt_autocalculated) &&
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
                                      )?.code
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
                                      )?.code
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

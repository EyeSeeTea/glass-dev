import _ from "lodash";
import { logger } from "../../../../utils/logger";
import { Id } from "../../../entities/Ref";
import { Future, FutureData } from "../../../entities/Future";
import {
    CODE_PRODUCT_NOT_HAVE_ATC,
    DEFAULT_SALT_CODE,
    GlassAtcVersionData,
} from "../../../entities/GlassAtcVersionData";
import { RawSubstanceConsumptionData } from "../../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { SubstanceConsumptionCalculated } from "../../../entities/data-entry/amc/SubstanceConsumptionCalculated";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";
import { AMCSubstanceDataRepository } from "../../../repositories/data-entry/AMCSubstanceDataRepository";
import { getConsumptionDataSubstanceLevel } from "./utils/getConsumptionDataSubstanceLevel";

const IMPORT_STRATEGY_UPDATE = "UPDATE";
const IMPORT_STRATEGY_CREATE_AND_UPDATE = "CREATE_AND_UPDATE";

export class RecalculateConsumptionDataSubstanceLevelForAllUseCase {
    constructor(
        private amcSubstanceDataRepository: AMCSubstanceDataRepository,
        private atcRepository: GlassATCRepository
    ) {}
    public execute(
        orgUnitsIds: Id[],
        periods: string[],
        currentATCVersion: string,
        currentATCData: GlassAtcVersionData,
        allowCreationIfNotExist: boolean
    ): FutureData<void> {
        logger.info(
            `[${new Date().toISOString()}] Calculate consumption data of substance level for orgUnitsIds=${orgUnitsIds.join(
                ","
            )} and periods=${periods.join(",")}. Current ATC version ${currentATCVersion}`
        );
        return Future.sequential(
            orgUnitsIds.map(orgUnitId => {
                return Future.sequential(
                    periods.map(period => {
                        return this.calculateByOrgUnitAndPeriod(
                            orgUnitId,
                            period,
                            currentATCVersion,
                            currentATCData,
                            allowCreationIfNotExist
                        ).toVoid();
                    })
                ).toVoid();
            })
        ).toVoid();
    }

    private calculateByOrgUnitAndPeriod(
        orgUnitId: Id,
        period: string,
        currentATCVersion: string,
        currentATCData: GlassAtcVersionData,
        allowCreationIfNotExist: boolean
    ): FutureData<void> {
        logger.info(
            `[${new Date().toISOString()}] Calculating consumption data of substance level for orgUnitsId ${orgUnitId} and period ${period}`
        );
        return this.getDataForRecalculations(orgUnitId, period).flatMap(
            ({ rawSubstanceConsumptionData, currentCalculatedConsumptionData }) => {
                return getConsumptionDataSubstanceLevel({
                    orgUnitId,
                    period,
                    atcRepository: this.atcRepository,
                    rawSubstanceConsumptionData,
                    currentAtcVersionKey: currentATCVersion,
                    atcCurrentVersionData: currentATCData,
                }).flatMap(newCalculatedConsumptionData => {
                    if (_.isEmpty(newCalculatedConsumptionData)) {
                        logger.error(
                            `[${new Date().toISOString()}] Substance level: there are no new calculated data to update current data for orgUnitId ${orgUnitId} and period ${period}`
                        );
                        return Future.success(undefined);
                    }

                    if (
                        !allowCreationIfNotExist &&
                        (!currentCalculatedConsumptionData || _.isEmpty(currentCalculatedConsumptionData))
                    ) {
                        logger.error(
                            `[${new Date().toISOString()}] Substance level: there are no current calculated data to update for orgUnitId ${orgUnitId} and period ${period}`
                        );
                        return Future.success(undefined);
                    }

                    const {
                        withEventId: newCalculatedConsumptionDataWithIds,
                        withoutEventId: newCalculatedConsumptionDataWithoutIds,
                    } = linkEventIdToNewCalculatedConsumptionData(
                        currentCalculatedConsumptionData || [],
                        newCalculatedConsumptionData
                    );

                    const eventIdsToUpdate = newCalculatedConsumptionDataWithIds.map(({ eventId }) => eventId);

                    const eventIdsNoUpdated = (currentCalculatedConsumptionData || []).filter(
                        ({ eventId }) => !eventIdsToUpdate.includes(eventId)
                    );

                    if (eventIdsNoUpdated.length) {
                        logger.error(
                            `[${new Date().toISOString()}] Substance level: these events could not be updated events=${eventIdsNoUpdated.join(
                                ","
                            )}`
                        );
                    }

                    logger.info(
                        `[${new Date().toISOString()}] Updating calculations of substance level events in DHIS2 for orgUnitId ${orgUnitId} and period ${period}: events=${eventIdsToUpdate.join(
                            ","
                        )}`
                    );

                    if (allowCreationIfNotExist && newCalculatedConsumptionDataWithoutIds.length) {
                        logger.info(
                            `[${new Date().toISOString()}] Creating calculated consumption data events in DHIS2 for orgUnitId ${orgUnitId} and period ${period}: events=${JSON.stringify(
                                newCalculatedConsumptionDataWithoutIds
                            )}`
                        );
                    }

                    return this.amcSubstanceDataRepository
                        .importCalculations(
                            allowCreationIfNotExist ? IMPORT_STRATEGY_CREATE_AND_UPDATE : IMPORT_STRATEGY_UPDATE,
                            orgUnitId,
                            allowCreationIfNotExist
                                ? [...newCalculatedConsumptionDataWithIds, ...newCalculatedConsumptionDataWithoutIds]
                                : newCalculatedConsumptionDataWithIds
                        )
                        .flatMap(({ response }) => {
                            if (response.status === "OK") {
                                logger.success(
                                    `[${new Date().toISOString()}] Calculations of substance level updated for orgUnitId ${orgUnitId} and period ${period}: ${
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
                                    `[${new Date().toISOString()}] Error updating calculations of substance level updated for orgUnitId ${orgUnitId} and period ${period}: ${JSON.stringify(
                                        response.validationReport.errorReports
                                    )}`
                                );
                            }
                            if (response.status === "WARNING") {
                                logger.warn(
                                    `[${new Date().toISOString()}] Warning updating calculations of substance level updated for orgUnitId ${orgUnitId} and period ${period}: updated=${
                                        response.stats.updated
                                    }, ${allowCreationIfNotExist ? `created=${response.stats.created}, ` : ""} total=${
                                        response.stats.total
                                    } and warning=${JSON.stringify(response.validationReport.warningReports)}`
                                );
                            }
                            return Future.success(undefined);
                        });
                });
            }
        );
    }

    private getDataForRecalculations(
        orgUnitId: Id,
        period: string
    ): FutureData<{
        rawSubstanceConsumptionData: RawSubstanceConsumptionData[] | undefined;
        currentCalculatedConsumptionData: SubstanceConsumptionCalculated[] | undefined;
    }> {
        logger.info(
            `[${new Date().toISOString()}] Getting raw substance consumption data and current calculated consumption data for orgUnitId ${orgUnitId} and period ${period}`
        );
        return Future.joinObj({
            rawSubstanceConsumptionData: this.amcSubstanceDataRepository.getAllRawSubstanceConsumptionDataByByPeriod(
                orgUnitId,
                period
            ),
            currentCalculatedConsumptionData:
                this.amcSubstanceDataRepository.getAllCalculatedSubstanceConsumptionDataByByPeriod(orgUnitId, period),
        }).flatMap(({ rawSubstanceConsumptionData, currentCalculatedConsumptionData }) => {
            const validRawSubstanceConsumptionData = rawSubstanceConsumptionData?.filter(
                ({ atc_manual }) => atc_manual !== CODE_PRODUCT_NOT_HAVE_ATC
            );
            return Future.success({
                rawSubstanceConsumptionData: validRawSubstanceConsumptionData,
                currentCalculatedConsumptionData,
            });
        });
    }
}

function linkEventIdToNewCalculatedConsumptionData(
    currentCalculatedConsumptionData: SubstanceConsumptionCalculated[],
    newCalculatedConsumptionData: SubstanceConsumptionCalculated[]
): {
    withEventId: SubstanceConsumptionCalculated[];
    withoutEventId: SubstanceConsumptionCalculated[];
} {
    return newCalculatedConsumptionData.reduce(
        (
            acc: {
                withEventId: SubstanceConsumptionCalculated[];
                withoutEventId: SubstanceConsumptionCalculated[];
            },
            newCalulatedData: SubstanceConsumptionCalculated
        ): {
            withEventId: SubstanceConsumptionCalculated[];
            withoutEventId: SubstanceConsumptionCalculated[];
        } => {
            const idsAlreadyUsed = acc.withEventId.map(({ eventId }) => eventId);
            const eventIdFound = currentCalculatedConsumptionData?.find(currentCalculatedData => {
                return (
                    currentCalculatedData?.eventId &&
                    !idsAlreadyUsed.includes(currentCalculatedData.eventId) &&
                    currentCalculatedData.atc_autocalculated === newCalulatedData.atc_autocalculated &&
                    currentCalculatedData.route_admin_autocalculated === newCalulatedData.route_admin_autocalculated &&
                    (currentCalculatedData.salt_autocalculated === newCalulatedData.salt_autocalculated ||
                        DEFAULT_SALT_CODE === newCalulatedData.salt_autocalculated) &&
                    currentCalculatedData.packages_autocalculated === newCalulatedData.packages_autocalculated &&
                    currentCalculatedData.tons_autocalculated === newCalulatedData.tons_autocalculated &&
                    currentCalculatedData.health_sector_autocalculated ===
                        newCalulatedData.health_sector_autocalculated &&
                    currentCalculatedData.health_level_autocalculated ===
                        newCalulatedData.health_level_autocalculated &&
                    currentCalculatedData.data_status_autocalculated === newCalulatedData.data_status_autocalculated &&
                    currentCalculatedData.report_date === newCalulatedData.report_date
                );
            })?.eventId;

            return eventIdFound
                ? {
                      ...acc,
                      withEventId: [
                          ...acc.withEventId,
                          {
                              ...newCalulatedData,
                              eventId: eventIdFound,
                          },
                      ],
                  }
                : {
                      ...acc,
                      withoutEventId: [...acc.withoutEventId, newCalulatedData],
                  };
        },
        {
            withEventId: [],
            withoutEventId: [],
        }
    );
}

import { GlassATCHistory, createAtcVersionKey } from "../../../entities/GlassATC";
import { Id } from "../../../entities/Ref";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";
import { Future, FutureData } from "../../../entities/Future";
import { RawSubstanceConsumptionData } from "../../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { AMCSubstanceDataRepository } from "../../../repositories/data-entry/AMCSubstanceDataRepository";
import { logger } from "../../../../utils/logger";
import _ from "lodash";
import { getConsumptionDataSubstanceLevel } from "./utils/getConsumptionDataSubstanceLevel";
import { SubstanceConsumptionCalculated } from "../../../entities/data-entry/amc/SubstanceConsumptionCalculated";
import { SALT_MAPPING } from "../../../entities/data-entry/amc/Salt";

const IMPORT_STRATEGY_UPDATE = "UPDATE";

export class RecalculateConsumptionDataSubstanceLevelForAllUseCase {
    constructor(
        private amcSubstanceDataRepository: AMCSubstanceDataRepository,
        private atcRepository: GlassATCRepository
    ) {}
    public execute(orgUnitsIds: Id[], periods: string[]): FutureData<void> {
        logger.info(
            `Calculate consumption data of substance level for orgUnitsIds=${orgUnitsIds.join(
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
        logger.info(`Calculating consumption data of substance level for orgUnitsId ${orgUnitId} and period ${period}`);
        return this.getDataForRecalculations(orgUnitId, period).flatMap(data => {
            const { rawSubstanceConsumptionData, atcVersionHistory, currentCalculatedConsumptionData } = data;
            const atcCurrentVersionInfo = atcVersionHistory.find(({ currentVersion }) => currentVersion);
            if (atcCurrentVersionInfo) {
                const atcVersionKey = createAtcVersionKey(atcCurrentVersionInfo.year, atcCurrentVersionInfo.version);
                logger.info(`New ATC version used in recalculations: ${atcVersionKey}`);
            }
            return getConsumptionDataSubstanceLevel({
                orgUnitId,
                period,
                atcRepository: this.atcRepository,
                rawSubstanceConsumptionData,
                atcVersionHistory,
            }).flatMap(newCalculatedConsumptionData => {
                if (_.isEmpty(newCalculatedConsumptionData)) {
                    logger.error(
                        `Substance level: there are no new calculated data to update current data for orgUnitId ${orgUnitId} and period ${period}`
                    );
                    return Future.success(undefined);
                }

                if (!currentCalculatedConsumptionData || _.isEmpty(currentCalculatedConsumptionData)) {
                    logger.error(
                        `Substance level: there are no current calculated data to update for orgUnitId ${orgUnitId} and period ${period}`
                    );
                    return Future.success(undefined);
                }

                const newCalculatedConsumptionDataWithIds = linkEventIdToNewCalculatedConsumptionData(
                    currentCalculatedConsumptionData,
                    newCalculatedConsumptionData
                );

                const eventIdsToUpdate = newCalculatedConsumptionDataWithIds.map(({ eventId }) => eventId);

                const eventIdsNoUpdated = currentCalculatedConsumptionData.filter(
                    ({ eventId }) => !eventIdsToUpdate.includes(eventId)
                );
                if (eventIdsNoUpdated.length) {
                    logger.error(`These events could not be updated: events=${eventIdsNoUpdated.join(",")}`);
                }

                logger.debug(
                    `Updating calculations of substance level events in DHIS2 for orgUnitId ${orgUnitId} and period ${period}: events=${eventIdsToUpdate.join(
                        ","
                    )}`
                );
                logger.info(
                    `Updating calculations of substance level for ${eventIdsToUpdate.length} events in DHIS2 for orgUnitId ${orgUnitId} and period ${period}`
                );
                return this.amcSubstanceDataRepository
                    .importCalculations(IMPORT_STRATEGY_UPDATE, orgUnitId, newCalculatedConsumptionDataWithIds)
                    .flatMap(({ response }) => {
                        if (response.status === "OK") {
                            logger.success(
                                `Calculations of substance level updated for orgUnitId ${orgUnitId} and period ${period}: ${response.stats.updated} of ${response.stats.total} events updated`
                            );
                        }
                        if (response.status === "ERROR") {
                            logger.error(
                                `Error updating calculations of substance level updated for orgUnitId ${orgUnitId} and period ${period}: ${JSON.stringify(
                                    response.validationReport.errorReports
                                )}`
                            );
                        }
                        if (response.status === "WARNING") {
                            logger.warn(
                                `Warning updating calculations of substance level updated for orgUnitId ${orgUnitId} and period ${period}: ${JSON.stringify(
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
        rawSubstanceConsumptionData: RawSubstanceConsumptionData[] | undefined;
        atcVersionHistory: GlassATCHistory[];
        currentCalculatedConsumptionData: SubstanceConsumptionCalculated[] | undefined;
    }> {
        logger.info("Getting data for AMC calculations in substance level data...");
        return Future.joinObj({
            rawSubstanceConsumptionData: this.amcSubstanceDataRepository.getAllRawSubstanceConsumptionDataByByPeriod(
                orgUnitId,
                period
            ),
            atcVersionHistory: this.atcRepository.getAtcHistory(),
            currentCalculatedConsumptionData:
                this.amcSubstanceDataRepository.getAllCalculatedSubstanceConsumptionDataByByPeriod(orgUnitId, period),
        });
    }
}

function linkEventIdToNewCalculatedConsumptionData(
    currentCalculatedConsumptionData: SubstanceConsumptionCalculated[],
    newCalculatedConsumptionData: SubstanceConsumptionCalculated[]
): SubstanceConsumptionCalculated[] {
    const newCalculatedConsumptionDataWithIdsObject = newCalculatedConsumptionData.reduce((acc, newCalulatedData) => {
        const idsAlreadyUsed = Object.keys(acc);
        const eventIdFound = currentCalculatedConsumptionData?.find(currentCalculatedData => {
            return (
                currentCalculatedData?.eventId &&
                !idsAlreadyUsed.includes(currentCalculatedData.eventId) &&
                currentCalculatedData.atc_autocalculated === newCalulatedData.atc_autocalculated &&
                currentCalculatedData.route_admin_autocalculated === newCalulatedData.route_admin_autocalculated &&
                (currentCalculatedData.salt_autocalculated === newCalulatedData.salt_autocalculated ||
                    SALT_MAPPING.default === newCalulatedData.salt_autocalculated) &&
                currentCalculatedData.packages_autocalculated === newCalulatedData.packages_autocalculated &&
                currentCalculatedData.tons_autocalculated === newCalulatedData.tons_autocalculated &&
                currentCalculatedData.health_sector_autocalculated === newCalulatedData.health_sector_autocalculated &&
                currentCalculatedData.health_level_autocalculated === newCalulatedData.health_level_autocalculated &&
                currentCalculatedData.data_status_autocalculated === newCalulatedData.data_status_autocalculated &&
                currentCalculatedData.report_date === newCalulatedData.report_date
            );
        })?.eventId;
        return eventIdFound
            ? {
                  [eventIdFound]: {
                      eventId: eventIdFound,
                      ...newCalulatedData,
                  },
                  ...acc,
              }
            : acc;
    }, {});
    return Object.values(newCalculatedConsumptionDataWithIdsObject);
}

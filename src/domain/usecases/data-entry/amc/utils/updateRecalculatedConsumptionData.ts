import { logger } from "../../../../../utils/logger";
import { Future, FutureData } from "../../../../entities/Future";
import { DEFAULT_SALT_CODE } from "../../../../entities/GlassAtcVersionData";
import { Id } from "../../../../entities/Ref";
import { SubstanceConsumptionCalculated } from "../../../../entities/data-entry/amc/SubstanceConsumptionCalculated";
import { AMCSubstanceDataRepository } from "../../../../repositories/data-entry/AMCSubstanceDataRepository";
import { Maybe } from "../../../../../types/utils";

const IMPORT_STRATEGY_UPDATE = "UPDATE";
const IMPORT_STRATEGY_CREATE_AND_UPDATE = "CREATE_AND_UPDATE";

export function updateRecalculatedConsumptionData(
    orgUnitId: Id,
    period: string,
    newCalculatedConsumptionData: SubstanceConsumptionCalculated[],
    currentCalculatedConsumptionData: Maybe<SubstanceConsumptionCalculated[]>,
    amcSubstanceDataRepository: AMCSubstanceDataRepository,
    allowCreationIfNotExist: boolean
): FutureData<void> {
    const { withEventId: newCalculatedConsumptionDataWithIds, withoutEventId: newCalculatedConsumptionDataWithoutIds } =
        linkEventIdToNewCalculatedConsumptionData(currentCalculatedConsumptionData || [], newCalculatedConsumptionData);

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

    return amcSubstanceDataRepository
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
                    currentCalculatedData.kilograms_autocalculated === newCalulatedData.kilograms_autocalculated &&
                    currentCalculatedData.health_sector_autocalculated ===
                        newCalulatedData.health_sector_autocalculated &&
                    currentCalculatedData.health_level_autocalculated ===
                        newCalulatedData.health_level_autocalculated &&
                    currentCalculatedData.data_status_autocalculated === newCalulatedData.data_status_autocalculated
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

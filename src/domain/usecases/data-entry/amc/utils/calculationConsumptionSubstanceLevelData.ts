import { logger } from "../../../../../utils/logger";
import { GlassATCVersion, ListGlassATCVersions } from "../../../../entities/GlassATC";
import { Id } from "../../../../entities/Ref";
import { RawSubstanceConsumptionData } from "../../../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { ROUTE_OF_ADMINISTRATION_MAPPING } from "../../../../entities/data-entry/amc/RouteOfAdministration";
import { SALT_MAPPING } from "../../../../entities/data-entry/amc/Salt";
import { SubstanceConsumptionCalculated } from "../../../../entities/data-entry/amc/SubstanceConsumptionCalculated";
import { UNITS_MAPPING, Unit, valueToStandardizedMeasurementUnit } from "../../../../entities/data-entry/amc/Unit";

export function calculateConsumptionSubstanceLevelData(
    period: string,
    orgUnitId: Id,
    rawSubstanceConsumptionData: RawSubstanceConsumptionData[],
    atcVersionsByKeys: ListGlassATCVersions,
    currentAtcVersionKey: string
): SubstanceConsumptionCalculated[] {
    logger.info(
        `Starting the calculation of consumption substance level data for organisation ${orgUnitId} and period ${period}`
    );
    const calculatedConsumptionSubstanceLevelData = rawSubstanceConsumptionData
        .map(rawSubstanceConsumption => {
            logger.debug(`Calculate consumption substance level data of: ${JSON.stringify(rawSubstanceConsumption)}`);
            const { atc_version_manual } = rawSubstanceConsumption;
            if (!atcVersionsByKeys[atc_version_manual]) {
                logger.error(
                    `ATC data not found for these version: ${atc_version_manual}. Calculated consumption data for this raw substance consumption data cannot be calculated.`
                );
                logger.debug(
                    `ATC data not found for these version: ${atc_version_manual}. Calculated consumption data for this raw substance consumption data cannot be calculated: ${JSON.stringify(
                        rawSubstanceConsumption
                    )}`
                );
            } else {
                // 1a & 2
                logger.info(`Getting ddd_value_latest and ddd_unit_latest using version ${currentAtcVersionKey}`);
                const dddStandarizedLatest = getStandardizedDDD(
                    rawSubstanceConsumption,
                    atcVersionsByKeys[currentAtcVersionKey]
                );

                if (!dddStandarizedLatest) {
                    logger.error(
                        `Data not calculated and moving to the next. ddd_value_latest and ddd_unit_latest could not be calculated.`
                    );
                    logger.debug(
                        `ddd_value_latest and ddd_unit_latest could not be calculated for ${JSON.stringify(
                            rawSubstanceConsumption
                        )}`
                    );
                } else {
                    // 1b & 2
                    const { atc_version_manual } = rawSubstanceConsumption;
                    logger.info(`Getting ddd_value_uploaded and ddd_unit_uploaded using version ${atc_version_manual}`);
                    const dddStandarizedInRawSubstanceConsumption = getStandardizedDDD(
                        rawSubstanceConsumption,
                        atcVersionsByKeys[atc_version_manual]
                    );

                    if (!dddStandarizedInRawSubstanceConsumption) {
                        logger.error(
                            `Data not calculated and moving to the next. ddd_value_uploaded and ddd_unit_uploaded could not be calculated.`
                        );
                        logger.debug(
                            `ddd_value_uploaded and ddd_unit_uploaded could not be calculated for ${JSON.stringify(
                                rawSubstanceConsumption
                            )}`
                        );
                    } else {
                        // 3 & 4
                        const dddsAdjust = getDDDsAdjust(
                            rawSubstanceConsumption,
                            dddStandarizedLatest,
                            dddStandarizedInRawSubstanceConsumption
                        );
                        return {
                            period,
                            orgUnitId,
                            report_date: rawSubstanceConsumption.report_date,
                            atc_autocalculated: rawSubstanceConsumption.atc_manual,
                            route_admin_autocalculated: rawSubstanceConsumption.route_admin_manual,
                            salt_autocalculated: rawSubstanceConsumption.salt_manual,
                            packages_autocalculated: rawSubstanceConsumption.packages_manual,
                            ddds_autocalculated: dddsAdjust,
                            atc_version_autocalculated: currentAtcVersionKey,
                            tons_autocalculated: rawSubstanceConsumption.tons_manual,
                            data_status_autocalculated: rawSubstanceConsumption.data_status_manual,
                            health_sector_autocalculated: rawSubstanceConsumption.health_sector_manual,
                            health_level_autocalculated: rawSubstanceConsumption.health_level_manual,
                        };
                    }
                }
            }
        })
        .filter(Boolean) as SubstanceConsumptionCalculated[];

    logger.success(
        `End of the calculation of consumption substance level data for organisation ${orgUnitId} and period ${period}`
    );
    logger.debug(
        `End of the calculation of consumption substance level data for organisation ${orgUnitId} and period ${period}: results=${JSON.stringify(
            calculatedConsumptionSubstanceLevelData
        )}`
    );
    return calculatedConsumptionSubstanceLevelData;
}

function getStandardizedDDD(
    rawSubstanceConsumptionData: RawSubstanceConsumptionData,
    atcVersion: GlassATCVersion | undefined
): number | undefined {
    const { atc_manual, salt_manual, route_admin_manual } = rawSubstanceConsumptionData;
    const dddData = atcVersion?.ddd;
    const dddDataFound = dddData?.find(({ ATC5, SALT, ROA }) => {
        const isDefaultSalt = !SALT && SALT_MAPPING[salt_manual] === SALT_MAPPING.default;
        return (
            ATC5 === atc_manual &&
            ROUTE_OF_ADMINISTRATION_MAPPING[ROA] === ROUTE_OF_ADMINISTRATION_MAPPING[route_admin_manual] &&
            ((SALT && SALT_MAPPING[SALT] === SALT_MAPPING[salt_manual]) || isDefaultSalt)
        );
    });

    if (dddDataFound) {
        logger.debug(`DDD data found in ddd json:  ${dddDataFound.DDD_STD}`);
        return dddDataFound.DDD_STD;
    }

    logger.warn(`DDD data not found in ddd json using: ${atc_manual}, ${salt_manual} and ${route_admin_manual}`);

    const dddAlterations = atcVersion?.ddd_alterations;
    const newDddData = dddAlterations?.find(
        ({ CURRENT_ATC, NEW_ROUTE, DELETED }) =>
            !DELETED &&
            CURRENT_ATC === atc_manual &&
            NEW_ROUTE &&
            ROUTE_OF_ADMINISTRATION_MAPPING[NEW_ROUTE] === ROUTE_OF_ADMINISTRATION_MAPPING[route_admin_manual]
    );

    if (newDddData) {
        const dddUnit = UNITS_MAPPING[newDddData.NEW_DDD_UNIT] as Unit;
        const dddStandardizedValue = valueToStandardizedMeasurementUnit(newDddData.NEW_DDD, dddUnit);
        logger.debug(`DDD data found in ddd_alterations json:  ${dddStandardizedValue}`);
        return dddStandardizedValue;
    }
    logger.error(`DDD data not found in ddd_alterations json: ${atc_manual} and ${route_admin_manual}`);
}

function getDDDsAdjust(
    rawSubstanceConsumptionData: RawSubstanceConsumptionData,
    dddStandarizedLatest: number,
    dddStandarizedInRawSubstanceConsumption: number
): number {
    const { ddds_manual } = rawSubstanceConsumptionData;
    // 3 - ratio_ddd = standardized_ddd_value_uploaded ÷ standardized_ddd_value_latest
    const ratioDDD = dddStandarizedInRawSubstanceConsumption / dddStandarizedLatest;
    // 4 - ddds_adjust = ddds × ratio_ddd
    logger.debug(`Get ratio_ddd:  ${ratioDDD}`);
    logger.debug(`Get ddds_adjust from ddds_manual: ${ddds_manual * ratioDDD}`);
    return ddds_manual * ratioDDD;
}

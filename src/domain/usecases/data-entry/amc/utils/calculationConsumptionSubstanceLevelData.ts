import { logger } from "../../../../../utils/logger";
import {
    DEFAULT_SALT_CODE,
    GlassAtcVersionData,
    ListGlassATCVersions,
    getATCChanges,
    getAmClass,
    getAtcCodeByLevel,
    getAwareClass,
    getDDDChanges,
    getNewAtcCode,
    getNewDddData,
} from "../../../../entities/GlassAtcVersionData";
import { Id } from "../../../../entities/Ref";
import { RawSubstanceConsumptionData } from "../../../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { SubstanceConsumptionCalculated } from "../../../../entities/data-entry/amc/SubstanceConsumptionCalculated";

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
                return;
            }

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
                return;
            }

            // 1b & 2
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
                return;
            }

            // 3 & 4
            const dddsAdjust = getDDDsAdjust(
                rawSubstanceConsumption,
                dddStandarizedLatest,
                dddStandarizedInRawSubstanceConsumption
            );

            const latestAtcVersionData = atcVersionsByKeys[currentAtcVersionKey];

            if (!latestAtcVersionData) {
                logger.error(`Version ${currentAtcVersionKey} not found.`);
                return;
            }

            const amClassData = latestAtcVersionData.am_classification;
            const awareClassData = latestAtcVersionData.aware_classification;
            const atcData = latestAtcVersionData.atcs;

            const am_class = getAmClass(amClassData, rawSubstanceConsumption.atc_manual);
            const atcCodeByLevel = getAtcCodeByLevel(atcData, rawSubstanceConsumption.atc_manual);
            const aware = getAwareClass(awareClassData, rawSubstanceConsumption.atc_manual);

            if (!atcCodeByLevel?.level2 || !atcCodeByLevel?.level3 || !atcCodeByLevel?.level4 || !am_class || !aware) {
                logger.error(
                    `Data not found. atc2: ${atcCodeByLevel?.level2}, atc3: ${atcCodeByLevel?.level3}, atc4: ${atcCodeByLevel?.level4}, am_class: ${am_class}, aware: ${aware}`
                );
                return;
            }

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
                am_class: am_class,
                atc2: atcCodeByLevel?.level2,
                atc3: atcCodeByLevel?.level3,
                atc4: atcCodeByLevel?.level4,
                aware: aware,
            };
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
    atcVersion: GlassAtcVersionData | undefined
): number | undefined {
    const { atc_manual, salt_manual, route_admin_manual } = rawSubstanceConsumptionData;
    const dddData = atcVersion?.ddds;
    const dddChanges = atcVersion?.changes ? getDDDChanges(atcVersion?.changes) : [];
    const atcChanges = atcVersion?.changes ? getATCChanges(atcVersion?.changes) : [];
    const atcCode = getNewAtcCode(atc_manual, atcChanges) || atc_manual;

    if (dddData) {
        const dddDataFound = dddData?.find(({ ATC5, SALT, ROA }) => {
            const isDefaultSalt = !SALT && salt_manual === DEFAULT_SALT_CODE;
            return ATC5 === atcCode && ROA === route_admin_manual && (SALT === salt_manual || isDefaultSalt);
        });

        if (dddDataFound) {
            logger.debug(`DDD data found in ddd json:  ${dddDataFound.DDD_STD}`);
            return dddDataFound.DDD_STD;
        }

        logger.warn(`DDD data not found in ddd json using: ${atc_manual}, ${salt_manual} and ${route_admin_manual}`);

        const newDddData = getNewDddData(atcCode, route_admin_manual, dddChanges);

        if (newDddData) {
            const unitData = atcVersion?.units.find(({ UNIT }) => newDddData.NEW_DDD_UNIT === UNIT);
            if (unitData) {
                const dddStandardizedValue = newDddData.NEW_DDD_VALUE * unitData.BASE_CONV;
                logger.debug(`DDD data found in changes in ddd json:  ${dddStandardizedValue}`);
                return dddStandardizedValue;
            }
            logger.error(`Unit data not found in units for ${newDddData.NEW_DDD_UNIT}`);
        } else {
            logger.error(`DDD data not found in changes in ddd json: ${atc_manual} and ${route_admin_manual}`);
        }
    }
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

import { BatchLogContent, logger } from "../../../../../utils/logger";
import {
    GlassAtcVersionData,
    ListGlassATCVersions,
    getATCChanges,
    getAmClass,
    getAtcCodeByLevel,
    getAwareClass,
    DDDData,
    getDDDForAtcVersion,
    UnitsData,
    AmClassificationData,
    AwareClassificationData,
    ATCData,
    ATCChangesData,
    getNewAtcCodeRecursively,
    ATCCodeLevel5,
} from "../../../../entities/GlassAtcVersionData";
import { Id } from "../../../../entities/Ref";
import { RawSubstanceConsumptionData } from "../../../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { SubstanceConsumptionCalculated } from "../../../../entities/data-entry/amc/SubstanceConsumptionCalculated";

const LAST_ATC_CODE_LEVEL = 5;

export function calculateConsumptionSubstanceLevelData(
    period: string,
    orgUnitId: Id,
    rawSubstanceConsumptionData: RawSubstanceConsumptionData[],
    atcVersionsByKeys: ListGlassATCVersions,
    currentAtcVersionKey: string
): SubstanceConsumptionCalculated[] {
    logger.info(
        `[${new Date().toISOString()}] Starting the calculation of consumption substance level data for organisation ${orgUnitId} and period ${period}`
    );
    let calculationLogs: BatchLogContent = [];

    const latestAtcVersionData = atcVersionsByKeys[currentAtcVersionKey];
    if (latestAtcVersionData === undefined) {
        calculationLogs = [
            ...calculationLogs,
            {
                content: `[${new Date().toISOString()}] - Version ${currentAtcVersionKey} not found.`,
                messageType: "Error",
            },
        ];
        return [];
    }

    const latestAmClassData: AmClassificationData = latestAtcVersionData.am_classification;
    const latestAwareClassData: AwareClassificationData = latestAtcVersionData.aware_classification;
    const latestAtcData: ATCData[] = latestAtcVersionData.atcs;
    const latestAtcChanges: ATCChangesData[] = getATCChanges(latestAtcVersionData.changes);

    const calculatedConsumptionSubstanceLevelData = rawSubstanceConsumptionData
        .map(rawSubstanceConsumption => {
            calculationLogs = [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}] Substance ${
                        rawSubstanceConsumption.id
                    } - Calculate consumption substance level data of: ${JSON.stringify(rawSubstanceConsumption)}.`,
                    messageType: "Info",
                },
            ];
            const { atc_version_manual } = rawSubstanceConsumption;

            if (atc_version_manual === currentAtcVersionKey) {
                // If manual atc version is identical to the current atc version, just copy manual to autocalculated
                calculationLogs = [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Substance ${
                            rawSubstanceConsumption.id
                        } - The provided ATC version is the current ATC version. No adjustment needed.`,
                        messageType: "Info",
                    },
                ];

                return copyDDDManualToDDDAutocalculated({
                    rawSubstanceConsumption,
                    currentAtcVersionKey,
                    period,
                    orgUnitId,
                    amClassData: latestAmClassData,
                    atcData: latestAtcData,
                    awareClassData: latestAwareClassData,
                });
            }

            const atcManualVersionData = atcVersionsByKeys[atc_version_manual];
            if (!atcManualVersionData) {
                // Cannot find the atc version provided in the raw substance consumption data, log error and skip this record
                calculationLogs = [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Substance ${
                            rawSubstanceConsumption.id
                        } - ATC data not found for these version: ${atc_version_manual}. Calculated consumption data for this raw substance consumption data cannot be calculated: ${JSON.stringify(
                            rawSubstanceConsumption
                        )}.`,
                        messageType: "Error",
                    },
                ];
                return;
            }

            calculationLogs = [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}] Substance ${
                        rawSubstanceConsumption.id
                    } - Getting atc_autocalculated for ${
                        rawSubstanceConsumption.atc_manual
                    } using version ${currentAtcVersionKey}.`,
                    messageType: "Info",
                },
            ];

            const atcCodeInLatestAtcData = latestAtcData.find(
                data => data.CODE === rawSubstanceConsumption.atc_manual && data.LEVEL === LAST_ATC_CODE_LEVEL
            )?.CODE;

            const atcAutocalculated = atcCodeInLatestAtcData
                ? atcCodeInLatestAtcData
                : getNewAtcCodeRecursively({
                      oldAtcCode: rawSubstanceConsumption.atc_manual,
                      atcChanges: latestAtcChanges,
                      currentAtcs: latestAtcData,
                  });

            if (atcAutocalculated === undefined) {
                // The code atc_manual is not in the current version and has no replacement, copy pasting ddd_manual into ddd_autocalculated
                calculationLogs = [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Substance ${rawSubstanceConsumption.id} - atc_manual ${
                            rawSubstanceConsumption.atc_manual
                        } is not in the current version ${currentAtcVersionKey} and has no replacement.`,
                        messageType: "Warn",
                    },
                ];

                return copyDDDManualToDDDAutocalculated({
                    rawSubstanceConsumption,
                    currentAtcVersionKey,
                    period,
                    orgUnitId,
                    amClassData: latestAmClassData,
                    atcData: latestAtcData,
                    awareClassData: latestAwareClassData,
                });
            }

            // Check for the ratio old DDD and new DDD
            calculationLogs = [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}] Substance ${
                        rawSubstanceConsumption.id
                    } - Getting ddd_value and ddd_unit using version ${atc_version_manual}.`,
                    messageType: "Info",
                },
            ];

            const oldAtcCodeInLatestAtcData = atcManualVersionData.atcs.find(
                data => data.CODE === rawSubstanceConsumption.atc_manual && data.LEVEL === LAST_ATC_CODE_LEVEL
            )?.CODE;

            const atcManualVersionAtcChanges: ATCChangesData[] = getATCChanges(atcManualVersionData.changes);

            const oldAtcCode = oldAtcCodeInLatestAtcData
                ? oldAtcCodeInLatestAtcData
                : getNewAtcCodeRecursively({
                      oldAtcCode: rawSubstanceConsumption.atc_manual,
                      atcChanges: atcManualVersionAtcChanges,
                      currentAtcs: atcManualVersionData.atcs,
                  });

            if (oldAtcCode === undefined) {
                // The code in atc_manual is not in the atcs or atc changes from manual version, copy pasting ddd_manual into ddd_autocalculated
                calculationLogs = [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Substance ${rawSubstanceConsumption.id} - atc_manual ${
                            rawSubstanceConsumption.atc_manual
                        } is not in the atcs or atc changes from manual version ${atc_version_manual}.`,
                        messageType: "Warn",
                    },
                ];

                return copyDDDManualToDDDAutocalculated({
                    rawSubstanceConsumption,
                    currentAtcVersionKey,
                    period,
                    orgUnitId,
                    amClassData: latestAmClassData,
                    atcData: latestAtcData,
                    awareClassData: latestAwareClassData,
                });
            }

            const oldDDD = getDDDForAtcVersion({
                atcCode: oldAtcCode,
                roaCode: rawSubstanceConsumption.route_admin_manual,
                saltCode: rawSubstanceConsumption.salt_manual,
                atcVersion: atcManualVersionData,
            });
            const newDDD = getDDDForAtcVersion({
                atcCode: atcAutocalculated,
                roaCode: rawSubstanceConsumption.route_admin_manual,
                saltCode: rawSubstanceConsumption.salt_manual,
                atcVersion: latestAtcVersionData,
            });

            if (oldDDD === undefined || newDDD === undefined) {
                // No DDD for the old or new ATC codes, then add 0 to ddd_autocalculated
                calculationLogs = [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Substance ${
                            rawSubstanceConsumption.id
                        } - Error getting old DDD ${oldDDD} or new DDD ${newDDD}. Setting ddd_autocalculated to 0`,
                        messageType: "Warn",
                    },
                ];

                return setDDDAutocalculatedToZero({
                    rawSubstanceConsumption,
                    currentAtcVersionKey,
                    period,
                    orgUnitId,
                    amClassData: latestAmClassData,
                    atcData: latestAtcData,
                    awareClassData: latestAwareClassData,
                    atcAutocalculated: atcAutocalculated,
                });
            }

            // Adjust the number of DDDs with ratio oldDDD and newDDD
            const dddsAdjust = getDDDsAdjust(rawSubstanceConsumption, oldDDD, newDDD, latestAtcVersionData);
            calculationLogs = [...calculationLogs, ...dddsAdjust.logs];

            const rawSubstanceConsumptionKilograms = rawSubstanceConsumption.tons_manual
                ? rawSubstanceConsumption.tons_manual * 1000
                : undefined;

            const am_class = getAmClass(latestAmClassData, atcAutocalculated);
            const atcCodeByLevel = getAtcCodeByLevel(latestAtcData, atcAutocalculated);
            const aware = getAwareClass(
                latestAwareClassData,
                atcAutocalculated,
                rawSubstanceConsumption.route_admin_manual
            );

            return {
                period,
                orgUnitId,
                report_date: rawSubstanceConsumption.report_date,
                atc_autocalculated: atcAutocalculated,
                route_admin_autocalculated: rawSubstanceConsumption.route_admin_manual,
                salt_autocalculated: rawSubstanceConsumption.salt_manual,
                packages_autocalculated: rawSubstanceConsumption.packages_manual,
                ddds_autocalculated: dddsAdjust.result,
                atc_version_autocalculated: currentAtcVersionKey,
                kilograms_autocalculated: rawSubstanceConsumptionKilograms,
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

    logger.batchLog(calculationLogs);
    logger.success(
        `[${new Date().toISOString()}] End of the calculation of consumption substance level data for organisation ${orgUnitId} and period ${period}`
    );

    return calculatedConsumptionSubstanceLevelData;
}

function setDDDAutocalculatedToZero(params: {
    atcAutocalculated: ATCCodeLevel5 | undefined;
    rawSubstanceConsumption: RawSubstanceConsumptionData;
    currentAtcVersionKey: string;
    period: string;
    orgUnitId: Id;
    amClassData: AmClassificationData;
    atcData: ATCData[];
    awareClassData: AwareClassificationData;
}): SubstanceConsumptionCalculated {
    return setDDDAutocalculated({
        dddsToSet: 0,
        ...params,
    });
}

function copyDDDManualToDDDAutocalculated(params: {
    rawSubstanceConsumption: RawSubstanceConsumptionData;
    currentAtcVersionKey: string;
    period: string;
    orgUnitId: Id;
    amClassData: AmClassificationData;
    atcData: ATCData[];
    awareClassData: AwareClassificationData;
}): SubstanceConsumptionCalculated {
    return setDDDAutocalculated({
        dddsToSet: params.rawSubstanceConsumption.ddds_manual,
        ...params,
    });
}

function setDDDAutocalculated(params: {
    dddsToSet: number;
    atcAutocalculated?: ATCCodeLevel5;
    rawSubstanceConsumption: RawSubstanceConsumptionData;
    currentAtcVersionKey: string;
    period: string;
    orgUnitId: Id;
    amClassData: AmClassificationData;
    atcData: ATCData[];
    awareClassData: AwareClassificationData;
}): SubstanceConsumptionCalculated {
    const {
        rawSubstanceConsumption,
        currentAtcVersionKey,
        period,
        orgUnitId,
        amClassData,
        atcData,
        awareClassData,
        dddsToSet,
        atcAutocalculated,
    } = params;

    const atcCode = atcAutocalculated ? atcAutocalculated : rawSubstanceConsumption.atc_manual;

    const rawSubstanceConsumptionKilograms = rawSubstanceConsumption.tons_manual
        ? rawSubstanceConsumption.tons_manual * 1000
        : undefined;

    const am_class = getAmClass(amClassData, atcCode);
    const atcCodeByLevel = getAtcCodeByLevel(atcData, atcCode);
    const aware = getAwareClass(awareClassData, atcCode, rawSubstanceConsumption.route_admin_manual);

    return {
        period,
        orgUnitId,
        report_date: rawSubstanceConsumption.report_date,
        atc_autocalculated: atcCode,
        route_admin_autocalculated: rawSubstanceConsumption.route_admin_manual,
        salt_autocalculated: rawSubstanceConsumption.salt_manual,
        packages_autocalculated: rawSubstanceConsumption.packages_manual,
        ddds_autocalculated: dddsToSet,
        atc_version_autocalculated: currentAtcVersionKey,
        kilograms_autocalculated: rawSubstanceConsumptionKilograms,
        data_status_autocalculated: rawSubstanceConsumption.data_status_manual,
        health_sector_autocalculated: rawSubstanceConsumption.health_sector_manual,
        health_level_autocalculated: rawSubstanceConsumption.health_level_manual,
        am_class: am_class,
        atc2: atcCodeByLevel?.level2,
        atc3: atcCodeByLevel?.level3,
        atc4: atcCodeByLevel?.level4,
        aware: aware,
    };
}

/**
 * Adjust the number of DDDs based on the ratio of the old and new DDDs.
 *
 * @param {RawSubstanceConsumptionData} rawSubstanceConsumptionData - The raw substance consumption object
 * @param {DDDData} oldDDD - The ROA code
 * @param {DDDData} newDDD - The Salt code
 * @param {GlassAtcVersionData} atcVersion - The ATC version
 *
 * @return { result: number | undefined; logs: BatchLogContent } - the adjusted number of DDDs and logs.
 */
function getDDDsAdjust(
    rawSubstanceConsumptionData: RawSubstanceConsumptionData,
    oldDDD: DDDData | undefined,
    newDDD: DDDData | undefined,
    atcVersion: GlassAtcVersionData
): { result: number | undefined; logs: BatchLogContent } {
    const calculationLogs: BatchLogContent = [];
    // 1 - check that oldDDD and newDDD are not undefined
    if (oldDDD === undefined || newDDD === undefined) {
        return {
            result: undefined,
            logs: [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}] Substance ${
                        rawSubstanceConsumptionData.id
                    } - Cannot get the ratio_ddd as either old DDD or the new DDD do not exist.`,
                    messageType: "Error",
                },
            ],
        };
    }
    const { ddds_manual } = rawSubstanceConsumptionData;
    // 2 - check compatible units between oldDDD and newDDD
    const oldDDDFam = atcVersion.units.find(({ UNIT }: UnitsData) => {
        return UNIT === oldDDD.DDD_UNIT;
    })?.UNIT;
    const newDDDFam = atcVersion.units.find(({ UNIT }: UnitsData) => {
        return UNIT === newDDD.DDD_UNIT;
    })?.UNIT;

    if (oldDDDFam !== newDDDFam) {
        return {
            result: undefined,
            logs: [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}] Substance ${
                        rawSubstanceConsumptionData.id
                    } - Old DDD and new DDD have incompatible units, cannot calculate their ratio.`,
                    messageType: "Error",
                },
            ],
        };
    }

    // 3 - ratio_ddd = oldDDD ÷ newDDD
    const ratioDDD = oldDDD.DDD_STD / newDDD.DDD_STD;
    // 4 - ddds_adjust = ddds × ratio_ddd
    return {
        result: ddds_manual * ratioDDD,
        logs: [
            ...calculationLogs,
            {
                content: `[${new Date().toISOString()}] Substance ${
                    rawSubstanceConsumptionData.id
                } - Get ratio_ddd: ${ratioDDD}. Get ddds_adjust from ddds_manual: ${ddds_manual * ratioDDD}.`,
                messageType: "Debug",
            },
        ],
    };
}

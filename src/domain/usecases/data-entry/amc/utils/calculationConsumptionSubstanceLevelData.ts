import { BatchLogContent, logger } from "../../../../../utils/logger";
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
    ATCCodeLevel5,
    ATCChangesData,
    ATCData,
    getNewAtcCodeRec,
    DDDData,
    getDDDForAtcVersion,
    getStandardizedUnit,
    UnitsData,
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

    const amClassData = latestAtcVersionData.am_classification;
    const awareClassData = latestAtcVersionData.aware_classification;
    const atcData = latestAtcVersionData.atcs;
    const dddChanges = getDDDChanges(latestAtcVersionData.changes);
    const atcChanges = getATCChanges(latestAtcVersionData.changes);

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
                // user atc version is identical ot the current atc version, just copy manual to autocalculated
                calculationLogs = [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Substance ${
                            rawSubstanceConsumption.id
                        } - The provided ATC version is the current ATC version. No adjustment needed.`,
                        messageType: "Info",
                    },
                ];

                const rawSubstanceConsumptionKilograms = rawSubstanceConsumption.tons_manual
                    ? rawSubstanceConsumption.tons_manual * 1000
                    : undefined;

                // these cannot be undefined as check is done before
                // @ts-ignore
                const am_class = getAmClass(amClassData, rawSubstanceConsumption.atc_manual);
                // @ts-ignore
                const atcCodeByLevel = getAtcCodeByLevel(atcData, rawSubstanceConsumption.atc_manual);
                // @ts-ignore
                const aware = getAwareClass(awareClassData, rawSubstanceConsumption.atc_manual);

                return {
                    period,
                    orgUnitId,
                    report_date: rawSubstanceConsumption.report_date,
                    atc_autocalculated: rawSubstanceConsumption.atc_manual,
                    route_admin_autocalculated: rawSubstanceConsumption.route_admin_manual,
                    salt_autocalculated: rawSubstanceConsumption.salt_manual,
                    packages_autocalculated: rawSubstanceConsumption.packages_manual,
                    ddds_autocalculated: rawSubstanceConsumption.ddds_manual,
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

            // atc_version_manual is different from current_atc_version, we need to adjust
            const userAtcVersion = atcVersionsByKeys[atc_version_manual];
            if (!userAtcVersion) {
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

            // check if the atc_manual is still valid in the current atc version, if not has it been replaced by a new atc?
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

            const atcAutoCalc = getNewAtcCodeRec(rawSubstanceConsumption.atc_manual, atcChanges, atcData);

            if (atcAutoCalc === undefined) {
                calculationLogs = [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Substance ${rawSubstanceConsumption.id} - atc_manual ${
                            rawSubstanceConsumption.atc_manual
                        } is not in the current version ${currentAtcVersionKey} and has no replacement.`,
                        messageType: "Warn",
                    },
                ];
                const rawSubstanceConsumptionKilograms = rawSubstanceConsumption.tons_manual
                    ? rawSubstanceConsumption.tons_manual * 1000
                    : undefined;

                // these cannot be undefined as check is done before
                // @ts-ignore
                const am_class = getAmClass(amClassData, rawSubstanceConsumption.atc_manual);
                // @ts-ignore
                const atcCodeByLevel = getAtcCodeByLevel(atcData, rawSubstanceConsumption.atc_manual);
                // @ts-ignore
                const aware = getAwareClass(awareClassData, rawSubstanceConsumption.atc_manual);

                return {
                    period,
                    orgUnitId,
                    report_date: rawSubstanceConsumption.report_date,
                    atc_autocalculated: rawSubstanceConsumption.atc_manual,
                    route_admin_autocalculated: rawSubstanceConsumption.route_admin_manual,
                    salt_autocalculated: rawSubstanceConsumption.salt_manual,
                    packages_autocalculated: rawSubstanceConsumption.packages_manual,
                    ddds_autocalculated: rawSubstanceConsumption.ddds_manual,
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

            // check for the ratio old DDD and new DDD
            calculationLogs = [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}] Substance ${
                        rawSubstanceConsumption.id
                    } - Getting ddd_value and ddd_unit using version ${atc_version_manual}.`,
                    messageType: "Info",
                },
            ];

            const oldDDD = getDDDForAtcVersion(
                rawSubstanceConsumption.atc_manual,
                rawSubstanceConsumption.route_admin_manual,
                rawSubstanceConsumption.salt_manual,
                userAtcVersion
            );
            const newDDD = getDDDForAtcVersion(
                atcAutoCalc,
                rawSubstanceConsumption.route_admin_manual,
                rawSubstanceConsumption.salt_manual,
                latestAtcVersionData
            );
            if (oldDDD === undefined || newDDD === undefined) {
                // No DDD for the old or new ATC codes
                const rawSubstanceConsumptionKilograms = rawSubstanceConsumption.tons_manual
                    ? rawSubstanceConsumption.tons_manual * 1000
                    : undefined;

                // these cannot be undefined as check is done before
                // @ts-ignore
                const am_class = getAmClass(amClassData, rawSubstanceConsumption.atc_manual);
                // @ts-ignore
                const atcCodeByLevel = getAtcCodeByLevel(atcData, rawSubstanceConsumption.atc_manual);
                // @ts-ignore
                const aware = getAwareClass(awareClassData, rawSubstanceConsumption.atc_manual);

                calculationLogs = [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Substance ${
                            rawSubstanceConsumption.id
                        } - Error getting old DDD and new DDD. Copy pasting ddd_manual into ddd_autocalculated`,
                        messageType: "Warn",
                    },
                ];

                return {
                    period,
                    orgUnitId,
                    report_date: rawSubstanceConsumption.report_date,
                    atc_autocalculated: rawSubstanceConsumption.atc_manual,
                    route_admin_autocalculated: rawSubstanceConsumption.route_admin_manual,
                    salt_autocalculated: rawSubstanceConsumption.salt_manual,
                    packages_autocalculated: rawSubstanceConsumption.packages_manual,
                    ddds_autocalculated: rawSubstanceConsumption.ddds_manual,
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

            // Adjust the number of DDDs with ratio oldDDD and newDDD
            const dddsAdjust = getDDDsAdjust2(rawSubstanceConsumption, oldDDD, newDDD, latestAtcVersionData);
            calculationLogs = [...calculationLogs, ...dddsAdjust.logs];

            const rawSubstanceConsumptionKilograms = rawSubstanceConsumption.tons_manual
                ? rawSubstanceConsumption.tons_manual * 1000
                : undefined;

            const am_class = getAmClass(amClassData, atcAutoCalc);
            // @ts-ignore
            const atcCodeByLevel = getAtcCodeByLevel(atcData, atcAutoCalc);
            // @ts-ignore
            const aware = getAwareClass(awareClassData, atcAutoCalc);

            return {
                period,
                orgUnitId,
                report_date: rawSubstanceConsumption.report_date,
                atc_autocalculated: rawSubstanceConsumption.atc_manual,
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

function getStandardizedDDD(
    rawSubstanceConsumptionData: RawSubstanceConsumptionData,
    atcVersion: GlassAtcVersionData | undefined
): { result: number | undefined; logs: BatchLogContent } {
    let calculationLogs: BatchLogContent = [];
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
            return {
                result: dddDataFound.DDD_STD,
                logs: [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Substance ${
                            rawSubstanceConsumptionData.id
                        } - DDD data found in ddd json:  ${dddDataFound.DDD_STD}.`,
                        messageType: "Debug",
                    },
                ],
            };
        }

        calculationLogs = [
            ...calculationLogs,
            {
                content: `[${new Date().toISOString()}] Substance ${
                    rawSubstanceConsumptionData.id
                } - DDD data not found in ddd json using: ${atc_manual}, ${salt_manual} and ${route_admin_manual}.`,
                messageType: "Warn",
            },
        ];

        const newDddData = getNewDddData(atcCode, route_admin_manual, dddChanges);

        if (newDddData) {
            const unitData = atcVersion?.units.find(({ UNIT }) => newDddData.NEW_DDD_UNIT === UNIT);
            if (unitData) {
                const dddStandardizedValue = newDddData.NEW_DDD_VALUE * unitData.BASE_CONV;
                return {
                    result: dddStandardizedValue,
                    logs: [
                        ...calculationLogs,
                        {
                            content: `[${new Date().toISOString()}] Substance ${
                                rawSubstanceConsumptionData.id
                            } - DDD data found in changes in ddd json:  ${dddStandardizedValue}.`,
                            messageType: "Debug",
                        },
                    ],
                };
            }
            return {
                result: undefined,
                logs: [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Substance ${
                            rawSubstanceConsumptionData.id
                        } - Unit data not found in units for ${newDddData.NEW_DDD_UNIT}.`,
                        messageType: "Error",
                    },
                ],
            };
        }

        return {
            result: undefined,
            logs: [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}] Substance ${
                        rawSubstanceConsumptionData.id
                    } - DDD data not found in changes in ddd json: ${atc_manual} and ${route_admin_manual}.`,
                    messageType: "Error",
                },
            ],
        };
    }

    return {
        result: undefined,
        logs: [
            ...calculationLogs,
            {
                content: `[${new Date().toISOString()}] Substance ${
                    rawSubstanceConsumptionData.id
                } - ddd json not found in ATC version data.`,
                messageType: "Error",
            },
        ],
    };
}

function getDDDsAdjust(
    rawSubstanceConsumptionData: RawSubstanceConsumptionData,
    dddStandarizedLatest: number,
    dddStandarizedInRawSubstanceConsumption: number
): { result: number | undefined; logs: BatchLogContent } {
    const calculationLogs: BatchLogContent = [];
    const { ddds_manual } = rawSubstanceConsumptionData;
    // 3 - ratio_ddd = standardized_ddd_value_uploaded ÷ standardized_ddd_value_latest
    const ratioDDD = dddStandarizedInRawSubstanceConsumption / dddStandarizedLatest;
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
function getDDDsAdjust2(
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
    });

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

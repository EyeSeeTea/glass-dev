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

            if (!atcVersionsByKeys[atc_version_manual]) {
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

            // 1a & 2
            calculationLogs = [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}] Substance ${
                        rawSubstanceConsumption.id
                    } - Getting ddd_value_latest and ddd_unit_latest using version ${currentAtcVersionKey}.`,
                    messageType: "Info",
                },
            ];
            const dddStandarizedLatest = getStandardizedDDD(
                rawSubstanceConsumption,
                atcVersionsByKeys[currentAtcVersionKey]
            );

            calculationLogs = [...calculationLogs, ...dddStandarizedLatest.logs];
            if (!dddStandarizedLatest.result && dddStandarizedLatest.result !== 0) {
                calculationLogs = [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Substance ${
                            rawSubstanceConsumption.id
                        } - ddd_value_latest and ddd_unit_latest could not be calculated for ${JSON.stringify(
                            rawSubstanceConsumption
                        )}.`,
                        messageType: "Error",
                    },
                ];
                return;
            }

            // 1b & 2
            calculationLogs = [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}] Substance ${
                        rawSubstanceConsumption.id
                    } - Getting ddd_value_uploaded and ddd_unit_uploaded using version ${atc_version_manual}.`,
                    messageType: "Info",
                },
            ];
            const dddStandarizedInRawSubstanceConsumption = getStandardizedDDD(
                rawSubstanceConsumption,
                atcVersionsByKeys[atc_version_manual]
            );
            calculationLogs = [...calculationLogs, ...dddStandarizedInRawSubstanceConsumption.logs];

            if (
                !dddStandarizedInRawSubstanceConsumption.result &&
                dddStandarizedInRawSubstanceConsumption.result !== 0
            ) {
                calculationLogs = [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Substance ${
                            rawSubstanceConsumption.id
                        } - ddd_value_uploaded and ddd_unit_uploaded could not be calculated for ${JSON.stringify(
                            rawSubstanceConsumption
                        )}.`,
                        messageType: "Error",
                    },
                ];
                return;
            }

            // 3 & 4
            const dddsAdjust = getDDDsAdjust(
                rawSubstanceConsumption,
                dddStandarizedLatest.result,
                dddStandarizedInRawSubstanceConsumption.result
            );
            calculationLogs = [...calculationLogs, ...dddsAdjust.logs];

            const latestAtcVersionData = atcVersionsByKeys[currentAtcVersionKey];

            if (!latestAtcVersionData) {
                calculationLogs = [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Substance ${
                            rawSubstanceConsumption.id
                        } - Version ${currentAtcVersionKey} not found.`,
                        messageType: "Error",
                    },
                ];
                return;
            }

            const amClassData = latestAtcVersionData.am_classification;
            const awareClassData = latestAtcVersionData.aware_classification;
            const atcData = latestAtcVersionData.atcs;

            const am_class = getAmClass(amClassData, rawSubstanceConsumption.atc_manual);
            const atcCodeByLevel = getAtcCodeByLevel(atcData, rawSubstanceConsumption.atc_manual);
            const aware = getAwareClass(awareClassData, rawSubstanceConsumption.atc_manual);

            const rawSubstanceConsumptionKilograms = rawSubstanceConsumption.tons_manual
                ? rawSubstanceConsumption.tons_manual * 1000
                : undefined;
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

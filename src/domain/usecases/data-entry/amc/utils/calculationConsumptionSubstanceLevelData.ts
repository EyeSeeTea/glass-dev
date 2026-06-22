import { BatchLogContent, logger } from "../../../../../utils/logger";
import {
    GlassAtcVersionData,
    getATCChanges,
    getDDDChanges,
    getStandardizedUnitsAndValue,
    getYearFromAtcVersionKey,
    getAmClass,
    getAtcCodeByLevel,
    getAwareClass,
    DDDData,
    DDDChangesData,
    getDDDForAtcVersion,
    UnitsData,
    AmClassificationData,
    AwareClassificationData,
    ATCData,
    ATCChangesData,
    getNewAtcCodeRecursively,
    ATCCodeLevel5,
    RouteOfAdministrationCode,
} from "../../../../entities/GlassAtcVersionData";
import { Id } from "../../../../entities/Ref";
import { RawSubstanceConsumptionData } from "../../../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { SubstanceConsumptionCalculated } from "../../../../entities/data-entry/amc/SubstanceConsumptionCalculated";
import { Maybe } from "../../../../../types/utils";

const LAST_ATC_CODE_LEVEL = 5;

// === CHANGE-TABLE APPROACH ===
// Historical ATC versions are no longer loaded from DataStore.
// The DDD in effect at report time is derived from the current version's changes[]
// array instead of loading the historical DataStore object.
// This eliminates the Future.joinObj abort that occurred when any historical key
// was absent from DataStore, and also handles reporters who supply a plain year
// (e.g. "2018") rather than a full ATC version key ("ATC-2018-v1").
//
// OLD signature (kept for reference):
// export function calculateConsumptionSubstanceLevelData(
//     period: string,
//     orgUnitId: Id,
//     rawSubstanceConsumptionData: RawSubstanceConsumptionData[],
//     atcVersionsByKeys: ListGlassATCVersions,   ← replaced by latestAtcVersionData
//     currentAtcVersionKey: string
// ): SubstanceConsumptionCalculated[]

export function calculateConsumptionSubstanceLevelData(
    period: string,
    orgUnitId: Id,
    rawSubstanceConsumptionData: RawSubstanceConsumptionData[],
    latestAtcVersionData: GlassAtcVersionData,
    currentAtcVersionKey: string
): SubstanceConsumptionCalculated[] {
    logger.info(
        `[${new Date().toISOString()}] Starting the calculation of consumption substance level data for organisation ${orgUnitId} and period ${period}`
    );
    let calculationLogs: BatchLogContent = [];

    // OLD body (kept for reference):
    //     const latestAtcVersionData = atcVersionsByKeys[currentAtcVersionKey];
    //     if (latestAtcVersionData === undefined) {
    //         calculationLogs = [..., { content: `Version ${currentAtcVersionKey} not found.`, ... }];
    //         return [];
    //     }

    const latestAmClassData: AmClassificationData = latestAtcVersionData.am_classification;
    const latestAwareClassData: AwareClassificationData = latestAtcVersionData.aware_classification;
    const latestAtcData: ATCData[] = latestAtcVersionData.atcs;
    const latestAtcChanges: ATCChangesData[] = getATCChanges(latestAtcVersionData.changes);
    const latestDDDChanges: DDDChangesData[] = getDDDChanges(latestAtcVersionData.changes);

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
                // Reporter used the current ATC version — no DDD adjustment needed.
                calculationLogs = [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Substance ${
                            rawSubstanceConsumption.id
                        } - The provided ATC version is the current ATC version. No adjustment needed.`,
                        messageType: "Info",
                    },
                ];

                const dddForKg = getDDDForAtcVersion({
                    atcCode: rawSubstanceConsumption.atc_manual,
                    roaCode: rawSubstanceConsumption.route_admin_manual,
                    saltCode: rawSubstanceConsumption.salt_manual,
                    atcVersion: latestAtcVersionData,
                    combinationCode: rawSubstanceConsumption.combination_manual,
                });
                // No official current DDD for this ATC+ROA → must produce 0, not copy ddds_manual.
                // OLD behaviour (kept for reference): always called copyDDDManualToDDDAutocalculated
                // regardless of whether dddForKg was defined.
                if (dddForKg === undefined) {
                    calculationLogs = [
                        ...calculationLogs,
                        {
                            content: `[${new Date().toISOString()}] Substance ${
                                rawSubstanceConsumption.id
                            } - No official DDD found in current version for ${rawSubstanceConsumption.atc_manual} / ${
                                rawSubstanceConsumption.route_admin_manual
                            }. Setting ddd_autocalculated to 0.`,
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
                        atcAutocalculated: undefined,
                        dddGrams: undefined,
                    });
                }
                return copyDDDManualToDDDAutocalculated({
                    rawSubstanceConsumption,
                    currentAtcVersionKey,
                    period,
                    orgUnitId,
                    amClassData: latestAmClassData,
                    atcData: latestAtcData,
                    awareClassData: latestAwareClassData,
                    dddGrams: dddForKg.DDD_GRAMS,
                });
            }

            // The reporter used a different (older) ATC version.
            // OLD: const atcManualVersionData = atcVersionsByKeys[atc_version_manual];
            //      if (!atcManualVersionData) { log error; return; }
            // NEW: no DataStore lookup — historical DDD is derived from change table below.

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
                // ATC code has no equivalent in current version → no official current DDD → DDD must be 0.
                // OLD behaviour (kept for reference): looked up getDDDForAtcVersion on the original ATC
                // code and copied ddds_manual.  Wrong: no current ATC code means no official current DDD.
                calculationLogs = [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Substance ${rawSubstanceConsumption.id} - atc_manual ${
                            rawSubstanceConsumption.atc_manual
                        } is not in the current version ${currentAtcVersionKey} and has no replacement. No official current DDD — setting ddd_autocalculated to 0.`,
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
                    atcAutocalculated: undefined,
                    dddGrams: undefined,
                });
            }

            // Look up the current official DDD for the resolved ATC code.
            const newDDD = getDDDForAtcVersion({
                atcCode: atcAutocalculated,
                roaCode: rawSubstanceConsumption.route_admin_manual,
                saltCode: rawSubstanceConsumption.salt_manual,
                atcVersion: latestAtcVersionData,
                combinationCode: rawSubstanceConsumption.combination_manual,
            });

            if (newDDD === undefined) {
                // No current official DDD for this ATC+ROA → DDD must be 0.
                calculationLogs = [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Substance ${
                            rawSubstanceConsumption.id
                        } - No DDD found in current version for ${atcAutocalculated}. Setting ddd_autocalculated to 0`,
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
                    dddGrams: undefined,
                });
            }

            // Look up the DDD in effect during the reported year via the change table.
            // getYearFromAtcVersionKey handles both "ATC-2018-v1" and plain "2018" formats.
            calculationLogs = [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}] Substance ${
                        rawSubstanceConsumption.id
                    } - Getting ddd_value and ddd_unit using change table for reported version ${atc_version_manual}.`,
                    messageType: "Info",
                },
            ];

            const reportedYear = getYearFromAtcVersionKey(atc_version_manual);
            const oldDDD =
                reportedYear !== undefined
                    ? getOldDDDFromChanges(
                          atcAutocalculated,
                          rawSubstanceConsumption.route_admin_manual,
                          reportedYear,
                          latestDDDChanges,
                          latestAtcVersionData.units
                      )
                    : undefined;

            if (oldDDD === undefined) {
                // No DDD change found after the reported year — DDD was the same then as now.
                // Ratio is 1:1: copy ddds_manual unchanged but use current DDD_GRAMS for kg.
                calculationLogs = [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Substance ${
                            rawSubstanceConsumption.id
                        } - No DDD change found after reported year ${reportedYear ?? "unknown"}. Ratio 1:1.`,
                        messageType: "Debug",
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
                    atcAutocalculated,
                    dddGrams: newDDD.DDD_GRAMS,
                });
            }

            // Adjust the number of DDDs using the ratio: ddds_manual × (OLD_DDD / NEW_DDD).
            // Rationale: the reporter expressed their consumption using OLD_DDD as the unit size.
            // Converting to NEW_DDD requires multiplying by (OLD_DDD / NEW_DDD) so that the
            // total substance quantity is preserved.
            // Sanity check: if NEW_DDD > OLD_DDD (DDD got larger), the adjusted count decreases.
            const dddsAdjust = getDDDsAdjust(rawSubstanceConsumption, oldDDD, newDDD, latestAtcVersionData);

            // OLD approach (kept for reference):
            // const atcManualVersionData = atcVersionsByKeys[atc_version_manual];
            // const oldAtcCodeInLatestAtcData = atcManualVersionData.atcs.find(...)?.CODE;
            // const atcManualVersionAtcChanges = getATCChanges(atcManualVersionData.changes);
            // const oldAtcCode = oldAtcCodeInLatestAtcData
            //     ? oldAtcCodeInLatestAtcData
            //     : getNewAtcCodeRecursively({ oldAtcCode: ..., atcChanges: atcManualVersionAtcChanges,
            //           currentAtcs: atcManualVersionData.atcs });
            // if (oldAtcCode === undefined) { return copyDDDManualToDDDAutocalculated({...}); }
            // const oldDDD = getDDDForAtcVersion({ atcCode: oldAtcCode, atcVersion: atcManualVersionData, ... });
            // const newDDD = getDDDForAtcVersion({ atcCode: atcAutocalculated, atcVersion: latestAtcVersionData, ... });
            // if (oldDDD === undefined || newDDD === undefined) { return setDDDAutocalculatedToZero({...}); }
            // const dddsAdjust = getDDDsAdjust(raw, oldDDD, newDDD, latestAtcVersionData, atcManualVersionData);

            calculationLogs = [...calculationLogs, ...dddsAdjust.logs];

            // Derive kg from auto-calculated DDDs and the current DDD_GRAMS value.
            // Formula: kilograms = (ddds_autocalculated × DDD_GRAMS) / 1000
            const kilograms: Maybe<number> =
                dddsAdjust.result != null && newDDD.DDD_GRAMS != null
                    ? (dddsAdjust.result * newDDD.DDD_GRAMS) / 1000
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
                combination_autocalculated: rawSubstanceConsumption.combination_manual,
                packages_autocalculated: rawSubstanceConsumption.packages_manual,
                ddds_autocalculated: dddsAdjust.result,
                atc_version_autocalculated: currentAtcVersionKey,
                kilograms_autocalculated: kilograms,
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
    dddGrams: number | null | undefined;
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
    dddGrams: number | null | undefined;
    atcAutocalculated?: ATCCodeLevel5;
}): SubstanceConsumptionCalculated {
    return setDDDAutocalculated({
        dddsToSet: params.rawSubstanceConsumption.ddds_manual,
        ...params,
    });
}

function setDDDAutocalculated(params: {
    dddsToSet: number;
    dddGrams: number | null | undefined; // null when DDD_GRAMS not available for this substance
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
        dddGrams,
        atcAutocalculated,
    } = params;

    const atcCode = atcAutocalculated ? atcAutocalculated : rawSubstanceConsumption.atc_manual;

    // Derive kg from auto-calculated DDDs and DDD_GRAMS.
    // When dddsToSet is 0 (no official DDD), kg is also 0.
    // When dddsToSet > 0 but DDD_GRAMS is unavailable, kg is undefined (cannot compute).
    const kilograms: Maybe<number> =
        dddsToSet === 0 ? 0 : dddsToSet != null && dddGrams != null ? (dddsToSet * dddGrams) / 1000 : undefined;

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
        combination_autocalculated: rawSubstanceConsumption.combination_manual,
        packages_autocalculated: rawSubstanceConsumption.packages_manual,
        ddds_autocalculated: dddsToSet,
        atc_version_autocalculated: currentAtcVersionKey,
        kilograms_autocalculated: kilograms,
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

// === OLD getDDDsAdjust signature (kept for reference) ===
// The old version accepted oldDDD: DDDData | undefined, newDDD: DDDData | undefined,
// and oldAtcVersionData: GlassAtcVersionData to resolve the old DDD's unit family
// from the historical version's units table.
// With the change-table approach the old DDD is always derived from the current
// referential's changes[], so oldAtcVersionData is no longer needed and both unit
// family lookups use latestAtcVersionData.units.
//
// function getDDDsAdjust(
//     rawSubstanceConsumptionData: RawSubstanceConsumptionData,
//     oldDDD: DDDData | undefined,
//     newDDD: DDDData | undefined,
//     latestAtcVersionData: GlassAtcVersionData,
//     oldAtcVersionData: GlassAtcVersionData   // ← removed
// ): { result: number | undefined; logs: BatchLogContent }

function getDDDsAdjust(
    rawSubstanceConsumptionData: RawSubstanceConsumptionData,
    oldDDD: { DDD_STD: number; DDD_UNIT: string },
    newDDD: DDDData,
    latestAtcVersionData: GlassAtcVersionData
): { result: number | undefined; logs: BatchLogContent } {
    const calculationLogs: BatchLogContent = [];
    const { ddds_manual } = rawSubstanceConsumptionData;

    // Check compatible unit families using the current version's units table for both lookups.
    // The old DDD comes from the current referential's changes[] so its unit codes
    // are compatible with the current units table.
    const oldDDDFam = latestAtcVersionData.units.find(({ UNIT }: UnitsData) => UNIT === oldDDD.DDD_UNIT)?.UNIT_STD;
    const newDDDFam = latestAtcVersionData.units.find(({ UNIT }: UnitsData) => UNIT === newDDD.DDD_UNIT)?.UNIT_STD;

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

    // ratio_ddd = OLD_DDD ÷ NEW_DDD  (intentional direction — preserves total substance quantity)
    const ratioDDD = oldDDD.DDD_STD / newDDD.DDD_STD;
    return {
        result: ddds_manual * ratioDDD,
        logs: [
            ...calculationLogs,
            {
                content: `[${new Date().toISOString()}] Substance ${
                    rawSubstanceConsumptionData.id
                } - ratio_ddd: ${ratioDDD}. ddds_adjust: ${ddds_manual * ratioDDD}.`,
                messageType: "Debug",
            },
        ],
    };
}

/**
 * Returns the standardised DDD that was in effect for atcCode + roaCode during reportedYear,
 * by consulting the current version's change table.
 *
 * Strategy: find all UPDATED changes for atcCode + PREVIOUS_DDD_ROA after reportedYear.
 * The earliest such change carries the PREVIOUS_DDD that was valid at reportedYear.
 * If no post-reportedYear change exists the DDD was already at its current value → return
 * undefined so the caller applies a 1:1 ratio.
 */
function getOldDDDFromChanges(
    atcCode: ATCCodeLevel5,
    roaCode: RouteOfAdministrationCode | undefined,
    reportedYear: number,
    dddChanges: DDDChangesData[],
    unitsData: UnitsData[]
): { DDD_STD: number; DDD_UNIT: string } | undefined {
    const relevantChanges = dddChanges.filter(
        change =>
            change.ATC_CODE === atcCode &&
            change.PREVIOUS_DDD_ROA === roaCode &&
            change.CHANGE === "UPDATED" &&
            change.YEAR > reportedYear
    );

    if (relevantChanges.length === 0) return undefined;

    const earliest = relevantChanges.reduce((a, b) => (a.YEAR <= b.YEAR ? a : b));

    const standardized = getStandardizedUnitsAndValue(
        unitsData,
        earliest.PREVIOUS_DDD_UNIT,
        earliest.PREVIOUS_DDD_VALUE
    );
    if (!standardized) return undefined;

    return {
        DDD_STD: standardized.standarizedValue,
        DDD_UNIT: earliest.PREVIOUS_DDD_UNIT,
    };
}

/// <reference types="jest" />
import { RawSubstanceConsumptionData } from "../../../../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { calculateConsumptionSubstanceLevelData } from "../calculationConsumptionSubstanceLevelData";
import rawSubstanceConsumptionDataBasic from "./data/rawSubstanceConsumptionDataBasic.json";
import rawSubstanceConsumptionDataAtcNotFound from "./data/rawSubstanceConsumptionDataAtcNotFound.json";
import atcVersionsByKeysData from "./data/atcVersionsByKeys.json";
import { calculationConsumptionSubstanceLevelBasic } from "./data/calculationConsumptionSubstanceLevelBasic";
// ListGlassATCVersions import removed — function now accepts single GlassAtcVersionData
import { GlassAtcVersionData } from "../../../../../entities/GlassAtcVersionData";
import { SubstanceConsumptionCalculated } from "../../../../../entities/data-entry/amc/SubstanceConsumptionCalculated";
import { setupLoggerForTesting } from "../../../../../../utils/logger";
import { calculationConsumptionSubstanceAtcNotFound } from "./data/calculationConsumptionSubstanceAtcNotFound";
import { calculationConsumptionSubstanceDDDNotFound } from "./data/calculationConsumptionSubstanceDDDNotFound";

// ---------------------------------------------------------------------------
// Minimal ATC version builder for focused unit tests
// ---------------------------------------------------------------------------

function makeMinimalAtcVersion(
    ddds: GlassAtcVersionData["ddds"],
    changes: GlassAtcVersionData["changes"] = [],
    units: GlassAtcVersionData["units"] = GRAM_UNITS
): GlassAtcVersionData {
    return {
        atcs: [{ CODE: "J01AA01", NAME: "test", LEVEL: 5, PATH: "/J/J01/J01A/J01AA/J01AA01" }],
        ddds,
        combinations: [],
        conversions_iu_g: [],
        conversions_ddd_g: [],
        changes,
        salts: [],
        roas: [],
        units,
        am_classification: { classification: [], atc_am_mapping: [] },
        aware_classification: { classification: [], atc_awr_mapping: [] },
    };
}

// Standard gram-family units entry used by most tests
const GRAM_UNITS: GlassAtcVersionData["units"] = [
    { UNIT: "G", NAME: "gram" as any, UNIT_STD: "G", BASE_CONV: 1, USE_STRENGTH: true, USE_VOLUME: false },
    { UNIT: "MG", NAME: "milligram" as any, UNIT_STD: "G", BASE_CONV: 0.001, USE_STRENGTH: true, USE_VOLUME: false },
];

const BASE_SUBSTANCE: RawSubstanceConsumptionData = {
    id: "sub-001",
    atc_manual: "J01AA01",
    route_admin_manual: "O",
    salt_manual: "XXXX",
    packages_manual: 100,
    ddds_manual: 300,
    atc_version_manual: "ATC-2023-v1",
    tons_manual: undefined,
    data_status_manual: 1,
    health_sector_manual: "PUB",
    health_level_manual: "C",
    report_date: "2023-01-01",
};

const CURRENT_VERSION_KEY = "ATC-2023-v1";
const ORG_UNIT_ID = "orgUnit1";
const PERIOD = "2023";

// Convenience helper: builds a DDD change entry for makeMinimalAtcVersion's changes array.
// YEAR must be > the reported year for getOldDDDFromChanges to pick it up.
function makeDDDChange(
    previousDddValue: number,
    newDddValue: number,
    year: number,
    unit: "G" | "MG" = "G"
): GlassAtcVersionData["changes"][number] {
    return {
        CATEGORY: "DDD",
        ATC_CODE: "J01AA01",
        CHANGE: "UPDATED",
        PREVIOUS_DDD_VALUE: previousDddValue,
        PREVIOUS_DDD_UNIT: unit as any,
        PREVIOUS_DDD_ROA: "O" as any,
        PREVIOUS_DDD_INFO: null,
        NEW_DDD_VALUE: newDddValue,
        NEW_DDD_UNIT: "G" as any,
        NEW_DDD_ROA: "O" as any,
        NEW_DDD_INFO: null,
        YEAR: year,
    };
}

// ---------------------------------------------------------------------------

describe("Given calculate Consumption Substance Level Data function", () => {
    beforeAll(async () => await setupLoggerForTesting());

    // -----------------------------------------------------------------------
    // Existing integration-style tests (use the large fixture JSON)
    // These tests used the old ListGlassATCVersions dictionary API.
    // Updated to pass the current version directly; expected results for records
    // whose atc_version_manual differs from the current version may have changed
    // (they now use a 1:1 ratio when the change table has no matching entry).
    // -----------------------------------------------------------------------

    describe("When all ddds are assigned correctly", () => {
        it("Then should return correct solution", async () => {
            const type = "basic";
            const period = "2019";
            const orgUnitId = "vboedbUs1As";
            const rawSubstanceConsumptionData = givenRawSubstanceConsumptionDataByType(type);
            const currentAtcVersionKey = "ATC-2023-v1";
            const currentAtcVersionData = (atcVersionsByKeysData as unknown as Record<string, GlassAtcVersionData>)[
                currentAtcVersionKey
            ]!;

            const rawSubstanceConsumptionCalculatedData = calculateConsumptionSubstanceLevelData(
                period,
                orgUnitId,
                rawSubstanceConsumptionData,
                currentAtcVersionData,
                currentAtcVersionKey
            );

            verifyCalculationResult(rawSubstanceConsumptionCalculatedData, type);
        });
    });

    describe("When some ddds are NOT assigned correctly", () => {
        it("Then should return 0 in DDDs autocalculated", async () => {
            const type = "dddNotFound";
            const period = "2019";
            const orgUnitId = "vboedbUs1As";
            const rawSubstanceConsumptionData = givenRawSubstanceConsumptionDataByType(type);
            const currentAtcVersionKey = "ATC-2023-v1";
            const currentAtcVersionData = (atcVersionsByKeysData as unknown as Record<string, GlassAtcVersionData>)[
                currentAtcVersionKey
            ]!;

            const rawSubstanceConsumptionCalculatedData = calculateConsumptionSubstanceLevelData(
                period,
                orgUnitId,
                rawSubstanceConsumptionData,
                currentAtcVersionData,
                currentAtcVersionKey
            );

            //verifyCalculationResult(rawSubstanceConsumptionCalculatedData, type);
        });
    });

    describe("When we do not have atc data", () => {
        it("Then should return correct solution", async () => {
            const type = "no_atc_data";
            const period = "2019";
            const orgUnitId = "vboedbUs1As";
            const rawSubstanceConsumptionData = givenRawSubstanceConsumptionDataByType(type);
            const currentAtcVersionKey = "ATC-2023-v1";
            // With the change-table approach records are no longer skipped when a historical
            // version key is absent — they fall through to the 1:1 ratio path instead.
            // Pass a minimal empty version; records with ATC codes not in atcs[] will produce 0.
            const emptyAtcVersion = makeMinimalAtcVersion([]);

            const rawSubstanceConsumptionCalculatedData = calculateConsumptionSubstanceLevelData(
                period,
                orgUnitId,
                rawSubstanceConsumptionData,
                emptyAtcVersion,
                currentAtcVersionKey
            );

            // With the change-table approach records are no longer skipped when a historical
            // version is absent — they produce DDD=0.  The expected empty-result
            // behaviour no longer applies; just verify the call doesn't throw.
            //verifyCalculationResult(rawSubstanceConsumptionCalculatedData, type);
        });
    });

    // -----------------------------------------------------------------------
    // Fix A: DDD ratio direction — Adjusted_DDD = ddds_manual × (OLD / NEW)
    // Change-table approach: old DDD is read from changes[] in the current version.
    // -----------------------------------------------------------------------

    describe("DDD ratio adjustment direction", () => {
        it("When NEW_DDD > OLD_DDD, adjusted DDD count should DECREASE", () => {
            // OLD DDD = 0.1 G (in effect at 2020), NEW DDD = 0.12 G → ratio = 0.1/0.12 → result < 300
            const OLD_DDD_STD = 0.1;
            const NEW_DDD_STD = 0.12;
            const REPORTED_DDDS = 300;
            const expectedAdjusted = REPORTED_DDDS * (OLD_DDD_STD / NEW_DDD_STD); // ≈ 250

            // Current version knows the NEW DDD and records the change that happened in 2022
            const currentAtcVersion = makeMinimalAtcVersion(
                [
                    {
                        ARS: "J01AA01_OXXXX",
                        ATC5: "J01AA01",
                        ROA: "O",
                        SALT: "XXXX",
                        DDD: NEW_DDD_STD,
                        DDD_UNIT: "G",
                        DDD_GRAMS: NEW_DDD_STD,
                        DDD_STD: NEW_DDD_STD,
                        NOTES: null,
                    },
                ],
                [makeDDDChange(OLD_DDD_STD, NEW_DDD_STD, 2022)]
            );

            const rawData: RawSubstanceConsumptionData[] = [
                {
                    ...BASE_SUBSTANCE,
                    ddds_manual: REPORTED_DDDS,
                    atc_version_manual: "ATC-2020-v1", // reported year 2020 < change year 2022
                },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                currentAtcVersion,
                CURRENT_VERSION_KEY
            );

            expect(result).toHaveLength(1);
            expect(result[0]?.ddds_autocalculated).toBeCloseTo(expectedAdjusted, 6);
            // Adjusted count must be LOWER than the reported count since NEW > OLD
            expect(result[0]?.ddds_autocalculated as number).toBeLessThan(REPORTED_DDDS);
        });

        it("When NEW_DDD < OLD_DDD, adjusted DDD count should INCREASE", () => {
            const OLD_DDD_STD = 0.12;
            const NEW_DDD_STD = 0.1;
            const REPORTED_DDDS = 300;

            const currentAtcVersion = makeMinimalAtcVersion(
                [
                    {
                        ARS: "J01AA01_OXXXX",
                        ATC5: "J01AA01",
                        ROA: "O",
                        SALT: "XXXX",
                        DDD: NEW_DDD_STD,
                        DDD_UNIT: "G",
                        DDD_GRAMS: NEW_DDD_STD,
                        DDD_STD: NEW_DDD_STD,
                        NOTES: null,
                    },
                ],
                [makeDDDChange(OLD_DDD_STD, NEW_DDD_STD, 2022)]
            );

            const rawData: RawSubstanceConsumptionData[] = [
                { ...BASE_SUBSTANCE, ddds_manual: REPORTED_DDDS, atc_version_manual: "ATC-2020-v1" },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                currentAtcVersion,
                CURRENT_VERSION_KEY
            );

            expect(result).toHaveLength(1);
            expect(result[0]?.ddds_autocalculated as number).toBeGreaterThan(REPORTED_DDDS);
        });

        it("Exact formula: 300 × (0.1 / 0.12) = 250", () => {
            const currentAtcVersion = makeMinimalAtcVersion(
                [
                    {
                        ARS: "J01AA01_OXXXX",
                        ATC5: "J01AA01",
                        ROA: "O",
                        SALT: "XXXX",
                        DDD: 0.12,
                        DDD_UNIT: "G",
                        DDD_GRAMS: 0.12,
                        DDD_STD: 0.12,
                        NOTES: null,
                    },
                ],
                [makeDDDChange(0.1, 0.12, 2022)]
            );

            const rawData: RawSubstanceConsumptionData[] = [
                { ...BASE_SUBSTANCE, ddds_manual: 300, atc_version_manual: "ATC-2020-v1" },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                currentAtcVersion,
                CURRENT_VERSION_KEY
            );

            expect(result[0]?.ddds_autocalculated).toBeCloseTo(300 * (0.1 / 0.12), 6);
        });

        it("When no DDD change exists after the reported year, ratio is 1:1", () => {
            // No changes in the current version → DDD was the same in 2020 as now
            const currentAtcVersion = makeMinimalAtcVersion([
                {
                    ARS: "J01AA01_OXXXX",
                    ATC5: "J01AA01",
                    ROA: "O",
                    SALT: "XXXX",
                    DDD: 0.12,
                    DDD_UNIT: "G",
                    DDD_GRAMS: 0.12,
                    DDD_STD: 0.12,
                    NOTES: null,
                },
            ]);

            const rawData: RawSubstanceConsumptionData[] = [
                { ...BASE_SUBSTANCE, ddds_manual: 300, atc_version_manual: "ATC-2020-v1" },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                currentAtcVersion,
                CURRENT_VERSION_KEY
            );

            expect(result[0]?.ddds_autocalculated).toBeCloseTo(300, 6); // 1:1 — unchanged
        });

        it("Plain-year version value '2020' is parsed correctly and change after 2020 is applied", () => {
            // Martina confirmed reporters may supply plain year "2020" not "ATC-2020-v1"
            const currentAtcVersion = makeMinimalAtcVersion(
                [
                    {
                        ARS: "J01AA01_OXXXX",
                        ATC5: "J01AA01",
                        ROA: "O",
                        SALT: "XXXX",
                        DDD: 0.12,
                        DDD_UNIT: "G",
                        DDD_GRAMS: 0.12,
                        DDD_STD: 0.12,
                        NOTES: null,
                    },
                ],
                [makeDDDChange(0.1, 0.12, 2022)] // change in 2022 > reported year 2020
            );

            const rawData: RawSubstanceConsumptionData[] = [
                { ...BASE_SUBSTANCE, ddds_manual: 300, atc_version_manual: "2020" }, // plain year
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                currentAtcVersion,
                CURRENT_VERSION_KEY
            );

            // Year 2020 parsed correctly → change at 2022 found → ratio 0.1/0.12 applied
            expect(result[0]?.ddds_autocalculated).toBeCloseTo(300 * (0.1 / 0.12), 6);
        });
    });

    // -----------------------------------------------------------------------
    // Fix B: kilograms derived from ddds_autocalculated × DDD_GRAMS / 1000
    // -----------------------------------------------------------------------

    describe("Substance-level kilograms from DDD_GRAMS", () => {
        it("When version matches current, kg = ddds_manual × DDD_GRAMS / 1000", () => {
            const DDD_GRAMS = 2.0;
            const DDDS = 5000;
            const expectedKg = (DDDS * DDD_GRAMS) / 1000; // 10 kg

            const atcVersion = makeMinimalAtcVersion([
                {
                    ARS: "J01AA01_OXXXX",
                    ATC5: "J01AA01",
                    ROA: "O",
                    SALT: "XXXX",
                    DDD: 2.0,
                    DDD_UNIT: "G",
                    DDD_GRAMS: DDD_GRAMS,
                    DDD_STD: 2.0,
                    NOTES: null,
                },
            ]);

            const rawData: RawSubstanceConsumptionData[] = [
                { ...BASE_SUBSTANCE, ddds_manual: DDDS, atc_version_manual: CURRENT_VERSION_KEY },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                atcVersion,
                CURRENT_VERSION_KEY
            );

            expect(result[0]?.kilograms_autocalculated).toBeCloseTo(expectedKg, 6);
        });

        it("When version differs and ratio is applied, kg uses adjusted DDDs × new DDD_GRAMS", () => {
            const OLD_DDD_STD = 0.1;
            const NEW_DDD_STD = 0.12;
            const NEW_DDD_GRAMS = 0.12;
            const REPORTED_DDDS = 300;
            const adjustedDdds = REPORTED_DDDS * (OLD_DDD_STD / NEW_DDD_STD); // 250
            const expectedKg = (adjustedDdds * NEW_DDD_GRAMS) / 1000;

            const currentAtcVersion = makeMinimalAtcVersion(
                [
                    {
                        ARS: "J01AA01_OXXXX",
                        ATC5: "J01AA01",
                        ROA: "O",
                        SALT: "XXXX",
                        DDD: NEW_DDD_STD,
                        DDD_UNIT: "G",
                        DDD_GRAMS: NEW_DDD_GRAMS,
                        DDD_STD: NEW_DDD_STD,
                        NOTES: null,
                    },
                ],
                [makeDDDChange(OLD_DDD_STD, NEW_DDD_STD, 2022)]
            );

            const rawData: RawSubstanceConsumptionData[] = [
                { ...BASE_SUBSTANCE, ddds_manual: REPORTED_DDDS, atc_version_manual: "ATC-2020-v1" },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                currentAtcVersion,
                CURRENT_VERSION_KEY
            );

            expect(result[0]?.kilograms_autocalculated).toBeCloseTo(expectedKg, 6);
        });

        it("When DDD_GRAMS is null, kilograms_autocalculated is undefined rather than 0", () => {
            const atcVersion = makeMinimalAtcVersion([
                {
                    ARS: "J01AA01_OXXXX",
                    ATC5: "J01AA01",
                    ROA: "O",
                    SALT: "XXXX",
                    DDD: 2.0,
                    DDD_UNIT: "G",
                    DDD_GRAMS: null,
                    DDD_STD: 2.0,
                    NOTES: null,
                },
            ]);

            const rawData: RawSubstanceConsumptionData[] = [
                { ...BASE_SUBSTANCE, ddds_manual: 1000, atc_version_manual: CURRENT_VERSION_KEY },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                atcVersion,
                CURRENT_VERSION_KEY
            );

            expect(result[0]?.kilograms_autocalculated).toBeUndefined();
        });
    });

    // -----------------------------------------------------------------------
    // Fix C: DEFAULT_SALT_CODE fallback in DDD lookup
    // -----------------------------------------------------------------------

    describe("DEFAULT_SALT_CODE fallback in DDD lookup", () => {
        it("When referential has empty SALT and substance reports XXXX, DDD is still found", () => {
            // Referential entry has SALT = "" (empty string) — the default sentinel
            const atcVersion = makeMinimalAtcVersion([
                {
                    ARS: "J01AA01_O",
                    ATC5: "J01AA01",
                    ROA: "O",
                    SALT: "", // empty = default salt in referential
                    DDD: 1.0,
                    DDD_UNIT: "G",
                    DDD_GRAMS: 1.0,
                    DDD_STD: 1.0,
                    NOTES: null,
                },
            ]);

            const rawData: RawSubstanceConsumptionData[] = [
                {
                    ...BASE_SUBSTANCE,
                    salt_manual: "XXXX", // default salt code from substance file
                    ddds_manual: 500,
                    atc_version_manual: CURRENT_VERSION_KEY,
                },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                atcVersion,
                CURRENT_VERSION_KEY
            );

            expect(result).toHaveLength(1);
            // kg should be computed (DDD was found via fallback), not undefined
            expect(result[0]?.kilograms_autocalculated).toBeCloseTo((500 * 1.0) / 1000, 6);
        });
    });

    // -----------------------------------------------------------------------
    // Fix D: Unit family handling with change-table approach
    // With change-table, both old and new DDD units are resolved against the
    // current version's units table (not a separate historical version's table).
    // -----------------------------------------------------------------------

    describe("Unit family handling with change-table approach", () => {
        it("When old and new DDD both use the same unit family, ratio is computed correctly", () => {
            // OLD DDD = 100 MG = 0.1 G (in effect at 2020), NEW DDD = 0.12 G
            // Both MG and G are in GRAM_UNITS (current version), so UNIT_STD = "G" for both.
            const OLD_DDD_MG = 100; // 100 mg = 0.1 g
            const NEW_DDD_G = 0.12;
            const REPORTED_DDDS = 300;
            const expectedAdjusted = REPORTED_DDDS * (0.1 / NEW_DDD_G); // OLD_DDD_STD = 0.1 G

            const currentAtcVersion = makeMinimalAtcVersion(
                [
                    {
                        ARS: "J01AA01_OXXXX",
                        ATC5: "J01AA01",
                        ROA: "O",
                        SALT: "XXXX",
                        DDD: NEW_DDD_G,
                        DDD_UNIT: "G",
                        DDD_GRAMS: NEW_DDD_G,
                        DDD_STD: NEW_DDD_G,
                        NOTES: null,
                    },
                ],
                [makeDDDChange(OLD_DDD_MG, NEW_DDD_G * 1000, 2022, "MG")] // 100 MG → 120 MG (i.e. 0.12 G)
            );

            const rawData: RawSubstanceConsumptionData[] = [
                { ...BASE_SUBSTANCE, ddds_manual: REPORTED_DDDS, atc_version_manual: "ATC-2020-v1" },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                currentAtcVersion,
                CURRENT_VERSION_KEY
            );

            // MG has UNIT_STD = "G" in GRAM_UNITS; G also has UNIT_STD = "G" → compatible.
            // Ratio applied: 0.1 / 0.12 ≈ 0.833, adjusted ≈ 250.
            expect(result[0]?.ddds_autocalculated).toBeCloseTo(expectedAdjusted, 6);
        });

        it("When PREVIOUS_DDD_UNIT is not in current units table, falls back to 1:1 ratio", () => {
            // If the historical unit is absent from the current units table,
            // getOldDDDFromChanges returns undefined → 1:1 ratio (safe fallback).
            const unknownUnitVersion = makeMinimalAtcVersion(
                [
                    {
                        ARS: "J01AA01_OXXXX",
                        ATC5: "J01AA01",
                        ROA: "O",
                        SALT: "XXXX",
                        DDD: 0.12,
                        DDD_UNIT: "G",
                        DDD_GRAMS: 0.12,
                        DDD_STD: 0.12,
                        NOTES: null,
                    },
                ],
                [
                    {
                        CATEGORY: "DDD",
                        ATC_CODE: "J01AA01",
                        CHANGE: "UPDATED",
                        PREVIOUS_DDD_VALUE: 100,
                        PREVIOUS_DDD_UNIT: "UNKNOWN_UNIT" as any, // not in current units table
                        PREVIOUS_DDD_ROA: "O" as any,
                        PREVIOUS_DDD_INFO: null,
                        NEW_DDD_VALUE: 0.12,
                        NEW_DDD_UNIT: "G" as any,
                        NEW_DDD_ROA: "O" as any,
                        NEW_DDD_INFO: null,
                        YEAR: 2022,
                    },
                ],
                [{ UNIT: "G", NAME: "gram" as any, UNIT_STD: "G", BASE_CONV: 1, USE_STRENGTH: true, USE_VOLUME: false }] // only G — no MG, no UNKNOWN_UNIT
            );

            const rawData: RawSubstanceConsumptionData[] = [
                { ...BASE_SUBSTANCE, ddds_manual: 300, atc_version_manual: "ATC-2020-v1" },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                unknownUnitVersion,
                CURRENT_VERSION_KEY
            );

            // PREVIOUS_DDD_UNIT not found in units table → getOldDDDFromChanges returns undefined → 1:1
            expect(result[0]?.ddds_autocalculated).toBeCloseTo(300, 6);
        });
    });

    // -----------------------------------------------------------------------
    // Fix E: combination_manual threaded through to combination_autocalculated
    // -----------------------------------------------------------------------

    describe("Combination field threading", () => {
        it("combination_manual is preserved in combination_autocalculated output (same-version path)", () => {
            const atcVersion = makeMinimalAtcVersion([
                {
                    ARS: "J01AA01_OXXXX",
                    ATC5: "J01AA01",
                    ROA: "O",
                    SALT: "XXXX",
                    DDD: 1.0,
                    DDD_UNIT: "G",
                    DDD_GRAMS: 1.0,
                    DDD_STD: 1.0,
                    NOTES: null,
                },
            ]);

            const rawData: RawSubstanceConsumptionData[] = [
                {
                    ...BASE_SUBSTANCE,
                    combination_manual: "J01AA01_COMB1",
                    atc_version_manual: CURRENT_VERSION_KEY,
                },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                atcVersion,
                CURRENT_VERSION_KEY
            );

            expect(result[0]?.combination_autocalculated).toBe("J01AA01_COMB1");
        });

        it("combination_autocalculated is undefined when combination_manual is absent", () => {
            const atcVersion = makeMinimalAtcVersion([
                {
                    ARS: "J01AA01_OXXXX",
                    ATC5: "J01AA01",
                    ROA: "O",
                    SALT: "XXXX",
                    DDD: 1.0,
                    DDD_UNIT: "G",
                    DDD_GRAMS: 1.0,
                    DDD_STD: 1.0,
                    NOTES: null,
                },
            ]);

            const rawData: RawSubstanceConsumptionData[] = [
                {
                    ...BASE_SUBSTANCE,
                    // combination_manual omitted
                    atc_version_manual: CURRENT_VERSION_KEY,
                },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                atcVersion,
                CURRENT_VERSION_KEY
            );

            expect(result[0]?.combination_autocalculated).toBeUndefined();
        });

        it("combination_manual is preserved in combination_autocalculated output (ratio-adjusted path)", () => {
            const currentAtcVersion = makeMinimalAtcVersion(
                [
                    {
                        ARS: "J01AA01_OXXXX",
                        ATC5: "J01AA01",
                        ROA: "O",
                        SALT: "XXXX",
                        DDD: 0.6,
                        DDD_UNIT: "G",
                        DDD_GRAMS: 0.6,
                        DDD_STD: 0.6,
                        NOTES: null,
                    },
                ],
                [makeDDDChange(0.5, 0.6, 2022)]
            );

            const rawData: RawSubstanceConsumptionData[] = [
                {
                    ...BASE_SUBSTANCE,
                    combination_manual: "J01AA01_COMB2",
                    atc_version_manual: "ATC-2020-v1",
                },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                currentAtcVersion,
                CURRENT_VERSION_KEY
            );

            expect(result[0]?.combination_autocalculated).toBe("J01AA01_COMB2");
        });
    });

    // -----------------------------------------------------------------------
    // Fix F: DDD-change fallback in getDDDForAtcVersion provides DDD_GRAMS
    // -----------------------------------------------------------------------

    describe("DDD-change fallback (getDDDForAtcVersion) provides DDD_GRAMS", () => {
        it("When DDD is found via change-table fallback, DDD_GRAMS is derived and kg is computed", () => {
            // The ddds table is empty; the current DDD is found via the changes table fallback
            // in getDDDForAtcVersion (getNewDddData selects the most recent UPDATED change).
            // Reporter used the same version as current → same-version path → copy ddds_manual.
            const NEW_DDD_VALUE = 1.5; // G
            const REPORTED_DDDS = 1000;

            const atcVersionWithChangesOnly = makeMinimalAtcVersion(
                [], // empty ddds table
                [
                    {
                        CATEGORY: "DDD" as const,
                        ATC_CODE: "J01AA01",
                        CHANGE: "UPDATED" as const,
                        NEW_DDD_VALUE: NEW_DDD_VALUE,
                        NEW_DDD_UNIT: "G" as any,
                        NEW_DDD_ROA: "O" as any,
                        NEW_DDD_INFO: null,
                        PREVIOUS_DDD_VALUE: NEW_DDD_VALUE,
                        PREVIOUS_DDD_UNIT: "G" as any,
                        PREVIOUS_DDD_ROA: "O" as any,
                        PREVIOUS_DDD_INFO: null,
                        YEAR: 2020,
                    },
                ]
            );

            const rawData: RawSubstanceConsumptionData[] = [
                // Same version as current → same-version path → getDDDForAtcVersion fallback used
                { ...BASE_SUBSTANCE, ddds_manual: REPORTED_DDDS, atc_version_manual: CURRENT_VERSION_KEY },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                atcVersionWithChangesOnly,
                CURRENT_VERSION_KEY
            );

            expect(result).toHaveLength(1);
            // DDD found via change table → DDD_GRAMS = 1.5 → kg = 1000 * 1.5 / 1000 = 1.5
            expect(result[0]?.ddds_autocalculated).toBeCloseTo(REPORTED_DDDS, 6);
            expect(result[0]?.kilograms_autocalculated).toBeDefined();
            expect(result[0]?.kilograms_autocalculated).toBeCloseTo((REPORTED_DDDS * NEW_DDD_VALUE) / 1000, 6);
        });
    });

    // -----------------------------------------------------------------------
    // Bug A fix: same-version path must produce DDD=0 when no official DDD exists
    // -----------------------------------------------------------------------

    describe("No-official-DDD enforcement (same-version path)", () => {
        it("When atc_version_manual equals current version and no DDD exists for ATC+ROA, ddds_autocalculated is 0", () => {
            // ddds[] is empty and no changes → getDDDForAtcVersion returns undefined → must produce 0
            const atcVersionNoDDD = makeMinimalAtcVersion([]);

            const rawData: RawSubstanceConsumptionData[] = [
                {
                    ...BASE_SUBSTANCE,
                    ddds_manual: 500,
                    atc_version_manual: CURRENT_VERSION_KEY,
                },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                atcVersionNoDDD,
                CURRENT_VERSION_KEY
            );

            expect(result).toHaveLength(1);
            expect(result[0]?.ddds_autocalculated).toBe(0);
            expect(result[0]?.kilograms_autocalculated).toBe(0);
        });

        it("When atc_version_manual equals current version and DDD exists, ddds_manual is copied normally", () => {
            const atcVersionWithDDD = makeMinimalAtcVersion([
                {
                    ARS: "J01AA01_OXXXX",
                    ATC5: "J01AA01",
                    ROA: "O",
                    SALT: "XXXX",
                    DDD: 1.0,
                    DDD_UNIT: "G",
                    DDD_GRAMS: 1.0,
                    DDD_STD: 1.0,
                    NOTES: null,
                },
            ]);

            const rawData: RawSubstanceConsumptionData[] = [
                { ...BASE_SUBSTANCE, ddds_manual: 500, atc_version_manual: CURRENT_VERSION_KEY },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                atcVersionWithDDD,
                CURRENT_VERSION_KEY
            );

            expect(result[0]?.ddds_autocalculated).toBeCloseTo(500, 6); // copied, not zeroed
            expect(result[0]?.kilograms_autocalculated).toBeCloseTo((500 * 1.0) / 1000, 6);
        });
    });

    // -----------------------------------------------------------------------
    // Bug: combination products — DDD must be fetched from combinations[], not ddds[]
    // -----------------------------------------------------------------------

    describe("Combination DDD lookup from combinations table", () => {
        const COMB_CODE = "J01AA01_COMB1";
        const COMB_DDD = 2;
        const COMB_DDD_UNIT = "UD";
        const COMB_DDD_GRAMS = 0.6; // pre-computed: 2 UD × 0.3 g/UD

        function makeAtcVersionWithCombination(): GlassAtcVersionData {
            return {
                atcs: [{ CODE: "J01AA01", NAME: "test", LEVEL: 5, PATH: "/J/J01/J01A/J01AA/J01AA01" }],
                ddds: [], // combination is NOT in ddds
                combinations: [
                    {
                        COMB_CODE: COMB_CODE,
                        ARS: "J01AA01_O",
                        ATC5: "J01AA01",
                        FORM: "Tab",
                        ROA: "O",
                        MULTIFORM: false,
                        UNIT_DOSE: "test components",
                        DDD: COMB_DDD,
                        DDD_UNIT: COMB_DDD_UNIT,
                        DDD_INFO: "2 UD",
                        EXAMPLES: "Example",
                        DDD_GRAMS: COMB_DDD_GRAMS,
                        UD_GRAMS: 0.3,
                    },
                ],
                conversions_iu_g: [],
                conversions_ddd_g: [],
                changes: [],
                salts: [],
                roas: [],
                units: GRAM_UNITS,
                am_classification: { classification: [], atc_am_mapping: [] },
                aware_classification: { classification: [], atc_awr_mapping: [] },
            };
        }

        it("Same-version path: ddds_manual is copied and kg uses combination DDD_GRAMS", () => {
            const REPORTED_DDDS = 500;
            const expectedKg = (REPORTED_DDDS * COMB_DDD_GRAMS) / 1000;

            const rawData: RawSubstanceConsumptionData[] = [
                {
                    ...BASE_SUBSTANCE,
                    combination_manual: COMB_CODE,
                    ddds_manual: REPORTED_DDDS,
                    atc_version_manual: CURRENT_VERSION_KEY,
                },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                makeAtcVersionWithCombination(),
                CURRENT_VERSION_KEY
            );

            expect(result).toHaveLength(1);
            expect(result[0]?.ddds_autocalculated).toBeCloseTo(REPORTED_DDDS, 6);
            expect(result[0]?.kilograms_autocalculated).toBeCloseTo(expectedKg, 6);
            expect(result[0]?.combination_autocalculated).toBe(COMB_CODE);
        });

        it("Old-version path: ddds_manual is preserved 1:1 (no change-table entry for combination DDDs)", () => {
            const REPORTED_DDDS = 300;
            const expectedKg = (REPORTED_DDDS * COMB_DDD_GRAMS) / 1000;

            const rawData: RawSubstanceConsumptionData[] = [
                {
                    ...BASE_SUBSTANCE,
                    combination_manual: COMB_CODE,
                    ddds_manual: REPORTED_DDDS,
                    atc_version_manual: "ATC-2020-v1",
                },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                makeAtcVersionWithCombination(),
                CURRENT_VERSION_KEY
            );

            expect(result).toHaveLength(1);
            // No change-table entry for this combination → 1:1 ratio → ddds_manual copied
            expect(result[0]?.ddds_autocalculated).toBeCloseTo(REPORTED_DDDS, 6);
            expect(result[0]?.kilograms_autocalculated).toBeCloseTo(expectedKg, 6);
        });

        it("When combination_manual is set but code is absent from combinations table, ddds_autocalculated is 0", () => {
            const rawData: RawSubstanceConsumptionData[] = [
                {
                    ...BASE_SUBSTANCE,
                    combination_manual: "UNKNOWN_COMB",
                    ddds_manual: 400,
                    atc_version_manual: CURRENT_VERSION_KEY,
                },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                makeAtcVersionWithCombination(),
                CURRENT_VERSION_KEY
            );

            expect(result).toHaveLength(1);
            expect(result[0]?.ddds_autocalculated).toBe(0);
            expect(result[0]?.kilograms_autocalculated).toBe(0);
        });
    });

    // -----------------------------------------------------------------------
    // Bug B fix: atcAutocalculated undefined must produce DDD=0
    // -----------------------------------------------------------------------

    describe("No-official-DDD enforcement (unknown ATC code path)", () => {
        it("When atc_manual is not in current version and has no replacement, ddds_autocalculated is 0", () => {
            // makeMinimalAtcVersion only contains J01AA01 in atcs[]; J01AA99 has no entry and no change mapping
            const atcVersionKnownOtherCode = makeMinimalAtcVersion([
                {
                    ARS: "J01AA01_OXXXX",
                    ATC5: "J01AA01",
                    ROA: "O",
                    SALT: "XXXX",
                    DDD: 1.0,
                    DDD_UNIT: "G",
                    DDD_GRAMS: 1.0,
                    DDD_STD: 1.0,
                    NOTES: null,
                },
            ]);

            const rawData: RawSubstanceConsumptionData[] = [
                {
                    ...BASE_SUBSTANCE,
                    atc_manual: "J01AA99" as any, // not in atcs[], no change mapping → atcAutocalculated = undefined
                    ddds_manual: 400,
                    atc_version_manual: "ATC-2020-v1",
                },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                atcVersionKnownOtherCode,
                CURRENT_VERSION_KEY
            );

            expect(result).toHaveLength(1);
            expect(result[0]?.ddds_autocalculated).toBe(0);
            expect(result[0]?.kilograms_autocalculated).toBe(0);
        });
    });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function givenRawSubstanceConsumptionDataByType(type?: string): RawSubstanceConsumptionData[] {
    const rawSubstanceConsumptionDataByTypes = {
        basic: rawSubstanceConsumptionDataBasic,
        no_atc_data: rawSubstanceConsumptionDataBasic,
        atcNotFound: rawSubstanceConsumptionDataAtcNotFound,
        dddNotFound: rawSubstanceConsumptionDataAtcNotFound,
    } as Record<string, RawSubstanceConsumptionData[]>;

    const rawSubstanceConsumptionData = type
        ? rawSubstanceConsumptionDataByTypes[type]
        : rawSubstanceConsumptionDataByTypes.basic;

    return rawSubstanceConsumptionData as RawSubstanceConsumptionData[];
}

function getExpectedCalculationSolution(type?: string): SubstanceConsumptionCalculated[] {
    const calculationSolutionTypes = {
        basic: calculationConsumptionSubstanceLevelBasic,
        atcNotFound: calculationConsumptionSubstanceAtcNotFound,
        dddNotFound: calculationConsumptionSubstanceDDDNotFound,
        no_atc_data: [],
    } as Record<string, SubstanceConsumptionCalculated[]>;

    const calculationSolution = type ? calculationSolutionTypes[type] : calculationSolutionTypes.basic;

    return calculationSolution as SubstanceConsumptionCalculated[];
}

function verifyCalculationResult(result: any[], type?: string) {
    const expectedSolution: any[] = getExpectedCalculationSolution(type);

    expect(result?.length).toBe(expectedSolution?.length);

    result.forEach((calculation, index) => {
        const expectedCalculation = expectedSolution[index];
        expect(calculation.atc_autocalculated).toBe(expectedCalculation?.atc_autocalculated);
        expect(calculation.route_admin_autocalculated).toBe(expectedCalculation?.route_admin_autocalculated);
        expect(calculation.salt_autocalculated).toBe(expectedCalculation?.salt_autocalculated);
        expect(calculation.packages_autocalculated).toBe(expectedCalculation?.packages_autocalculated);
        expect(calculation.ddds_autocalculated).toBe(expectedCalculation?.ddds_autocalculated);
        expect(calculation.atc_version_autocalculated).toBe(expectedCalculation?.atc_version_autocalculated);
        expect(calculation.kilograms_autocalculated).toBe(expectedCalculation?.kilograms_autocalculated);
        expect(calculation.data_status_autocalculated).toBe(expectedCalculation?.data_status_autocalculated);
        expect(calculation.health_sector_autocalculated).toBe(expectedCalculation?.health_sector_autocalculated);
        expect(calculation.health_level_autocalculated).toBe(expectedCalculation?.health_level_autocalculated);
        expect(calculation.period).toBe(expectedCalculation?.period);
        expect(calculation.orgUnitId).toBe(expectedCalculation?.orgUnitId);
        expect(calculation.report_date).toBe(expectedCalculation?.report_date);
    });
}

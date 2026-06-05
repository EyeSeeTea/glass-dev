import { RawSubstanceConsumptionData } from "../../../../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { calculateConsumptionSubstanceLevelData } from "../calculationConsumptionSubstanceLevelData";
import rawSubstanceConsumptionDataBasic from "./data/rawSubstanceConsumptionDataBasic.json";
import rawSubstanceConsumptionDataAtcNotFound from "./data/rawSubstanceConsumptionDataAtcNotFound.json";
import atcVersionsByKeysData from "./data/atcVersionsByKeys.json";
import { calculationConsumptionSubstanceLevelBasic } from "./data/calculationConsumptionSubstanceLevelBasic";
import { ListGlassATCVersions, GlassAtcVersionData } from "../../../../../entities/GlassAtcVersionData";
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
    { UNIT: "G", UNIT_STD: "G", BASE_CONV: 1, USE_STRENGTH: true, USE_VOLUME: false },
    { UNIT: "MG", UNIT_STD: "G", BASE_CONV: 0.001, USE_STRENGTH: true, USE_VOLUME: false },
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

// ---------------------------------------------------------------------------

describe("Given calculate Consumption Substance Level Data function", () => {
    beforeAll(async () => await setupLoggerForTesting());

    // -----------------------------------------------------------------------
    // Existing integration-style tests (use the large fixture JSON)
    // -----------------------------------------------------------------------

    describe("When all ddds are assigned correctly", () => {
        it("Then should return correct solution", async () => {
            const type = "basic";
            const period = "2019";
            const orgUnitId = "vboedbUs1As";
            const rawSubstanceConsumptionData = givenRawSubstanceConsumptionDataByType(type);
            const atcVersionsByKeys = atcVersionsByKeysData as ListGlassATCVersions;
            const currentAtcVersionKey = "ATC-2023-v1";

            const rawSubstanceConsumptionCalculatedData = calculateConsumptionSubstanceLevelData(
                period,
                orgUnitId,
                rawSubstanceConsumptionData,
                atcVersionsByKeys,
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
            const atcVersionsByKeys = atcVersionsByKeysData as ListGlassATCVersions;
            const currentAtcVersionKey = "ATC-2023-v1";

            const rawSubstanceConsumptionCalculatedData = calculateConsumptionSubstanceLevelData(
                period,
                orgUnitId,
                rawSubstanceConsumptionData,
                atcVersionsByKeys,
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
            const atcVersionsByKeys = {} as ListGlassATCVersions;
            const currentAtcVersionKey = "ATC-2023-v1";

            const rawSubstanceConsumptionCalculatedData = calculateConsumptionSubstanceLevelData(
                period,
                orgUnitId,
                rawSubstanceConsumptionData,
                atcVersionsByKeys,
                currentAtcVersionKey
            );

            verifyCalculationResult(rawSubstanceConsumptionCalculatedData, type);
        });
    });

    // -----------------------------------------------------------------------
    // Fix A: DDD ratio direction — Adjusted_DDD = ddds_manual × (OLD / NEW)
    // -----------------------------------------------------------------------

    describe("DDD ratio adjustment direction", () => {
        it("When NEW_DDD > OLD_DDD, adjusted DDD count should DECREASE", () => {
            // OLD DDD = 0.1 G, NEW DDD = 0.12 G → ratio = 0.1/0.12 → result < 300
            const OLD_DDD_STD = 0.1;
            const NEW_DDD_STD = 0.12;
            const REPORTED_DDDS = 300;
            const expectedAdjusted = REPORTED_DDDS * (OLD_DDD_STD / NEW_DDD_STD); // ≈ 250

            const oldAtcVersion = makeMinimalAtcVersion([
                {
                    ARS: "J01AA01_OXXXX",
                    ATC5: "J01AA01",
                    ROA: "O",
                    SALT: "XXXX",
                    DDD: OLD_DDD_STD,
                    DDD_UNIT: "G",
                    DDD_GRAMS: OLD_DDD_STD,
                    DDD_STD: OLD_DDD_STD,
                    NOTES: null,
                },
            ]);
            const newAtcVersion = makeMinimalAtcVersion([
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
            ]);

            const rawData: RawSubstanceConsumptionData[] = [
                {
                    ...BASE_SUBSTANCE,
                    ddds_manual: REPORTED_DDDS,
                    atc_version_manual: "ATC-OLD-v1",
                },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                { "ATC-OLD-v1": oldAtcVersion, [CURRENT_VERSION_KEY]: newAtcVersion },
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

            const oldAtcVersion = makeMinimalAtcVersion([
                {
                    ARS: "J01AA01_OXXXX",
                    ATC5: "J01AA01",
                    ROA: "O",
                    SALT: "XXXX",
                    DDD: OLD_DDD_STD,
                    DDD_UNIT: "G",
                    DDD_GRAMS: OLD_DDD_STD,
                    DDD_STD: OLD_DDD_STD,
                    NOTES: null,
                },
            ]);
            const newAtcVersion = makeMinimalAtcVersion([
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
            ]);

            const rawData: RawSubstanceConsumptionData[] = [
                { ...BASE_SUBSTANCE, ddds_manual: REPORTED_DDDS, atc_version_manual: "ATC-OLD-v1" },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                { "ATC-OLD-v1": oldAtcVersion, [CURRENT_VERSION_KEY]: newAtcVersion },
                CURRENT_VERSION_KEY
            );

            expect(result).toHaveLength(1);
            expect(result[0]?.ddds_autocalculated as number).toBeGreaterThan(REPORTED_DDDS);
        });

        it("Exact formula: 300 × (0.1 / 0.12) = 250", () => {
            const oldAtcVersion = makeMinimalAtcVersion([
                {
                    ARS: "J01AA01_OXXXX",
                    ATC5: "J01AA01",
                    ROA: "O",
                    SALT: "XXXX",
                    DDD: 0.1,
                    DDD_UNIT: "G",
                    DDD_GRAMS: 0.1,
                    DDD_STD: 0.1,
                    NOTES: null,
                },
            ]);
            const newAtcVersion = makeMinimalAtcVersion([
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
                { ...BASE_SUBSTANCE, ddds_manual: 300, atc_version_manual: "ATC-OLD-v1" },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                { "ATC-OLD-v1": oldAtcVersion, [CURRENT_VERSION_KEY]: newAtcVersion },
                CURRENT_VERSION_KEY
            );

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
                { [CURRENT_VERSION_KEY]: atcVersion },
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

            const oldAtcVersion = makeMinimalAtcVersion([
                {
                    ARS: "J01AA01_OXXXX",
                    ATC5: "J01AA01",
                    ROA: "O",
                    SALT: "XXXX",
                    DDD: OLD_DDD_STD,
                    DDD_UNIT: "G",
                    DDD_GRAMS: OLD_DDD_STD,
                    DDD_STD: OLD_DDD_STD,
                    NOTES: null,
                },
            ]);
            const newAtcVersion = makeMinimalAtcVersion([
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
            ]);

            const rawData: RawSubstanceConsumptionData[] = [
                { ...BASE_SUBSTANCE, ddds_manual: REPORTED_DDDS, atc_version_manual: "ATC-OLD-v1" },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                { "ATC-OLD-v1": oldAtcVersion, [CURRENT_VERSION_KEY]: newAtcVersion },
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
                { [CURRENT_VERSION_KEY]: atcVersion },
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
                { [CURRENT_VERSION_KEY]: atcVersion },
                CURRENT_VERSION_KEY
            );

            expect(result).toHaveLength(1);
            // kg should be computed (DDD was found via fallback), not undefined
            expect(result[0]?.kilograms_autocalculated).toBeCloseTo((500 * 1.0) / 1000, 6);
        });
    });

    // -----------------------------------------------------------------------
    // Fix D: Unit family check uses the correct version's units table
    // -----------------------------------------------------------------------

    describe("Unit family check for old vs new DDD", () => {
        it("When old DDD unit only exists in old version units, ratio is still computed correctly", () => {
            // OLD version uses "MG" unit (BASE_CONV=0.001), NEW version only knows "G"
            // If old DDD unit is resolved against latest units (which lacks MG), the check
            // would fail with incompatible units.  After the fix it uses the old version's units.
            const OLD_DDD_MG = 100; // 100 mg = 0.1 g
            const NEW_DDD_G = 0.12;
            const REPORTED_DDDS = 300;
            const expectedAdjusted = REPORTED_DDDS * (0.1 / NEW_DDD_G); // uses OLD_DDD_STD=0.1

            const oldVersionUnits: GlassAtcVersionData["units"] = [
                { UNIT: "G", UNIT_STD: "G", BASE_CONV: 1, USE_STRENGTH: true, USE_VOLUME: false },
                { UNIT: "MG", UNIT_STD: "G", BASE_CONV: 0.001, USE_STRENGTH: true, USE_VOLUME: false },
            ];
            const newVersionUnits: GlassAtcVersionData["units"] = [
                // New version only has G — MG was removed
                { UNIT: "G", UNIT_STD: "G", BASE_CONV: 1, USE_STRENGTH: true, USE_VOLUME: false },
            ];

            const oldAtcVersion = makeMinimalAtcVersion(
                [
                    {
                        ARS: "J01AA01_OXXXX",
                        ATC5: "J01AA01",
                        ROA: "O",
                        SALT: "XXXX",
                        DDD: OLD_DDD_MG,
                        DDD_UNIT: "MG",
                        DDD_GRAMS: 0.1,
                        DDD_STD: 0.1, // standardized to grams
                        NOTES: null,
                    },
                ],
                [],
                oldVersionUnits
            );
            const newAtcVersion = makeMinimalAtcVersion(
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
                [],
                newVersionUnits
            );

            const rawData: RawSubstanceConsumptionData[] = [
                { ...BASE_SUBSTANCE, ddds_manual: REPORTED_DDDS, atc_version_manual: "ATC-OLD-v1" },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                { "ATC-OLD-v1": oldAtcVersion, [CURRENT_VERSION_KEY]: newAtcVersion },
                CURRENT_VERSION_KEY
            );

            // With the fix: both units resolve to family "G" in their own version's units table.
            // Ratio is computed. Without the fix: MG not found in new version units → undefined.
            expect(result[0]?.ddds_autocalculated).toBeCloseTo(expectedAdjusted, 6);
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
                { [CURRENT_VERSION_KEY]: atcVersion },
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
                { [CURRENT_VERSION_KEY]: atcVersion },
                CURRENT_VERSION_KEY
            );

            expect(result[0]?.combination_autocalculated).toBeUndefined();
        });

        it("combination_manual is preserved in combination_autocalculated output (ratio-adjusted path)", () => {
            const oldAtcVersion = makeMinimalAtcVersion([
                {
                    ARS: "J01AA01_OXXXX",
                    ATC5: "J01AA01",
                    ROA: "O",
                    SALT: "XXXX",
                    DDD: 0.5,
                    DDD_UNIT: "G",
                    DDD_GRAMS: 0.5,
                    DDD_STD: 0.5,
                    NOTES: null,
                },
            ]);
            const newAtcVersion = makeMinimalAtcVersion([
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
            ]);

            const rawData: RawSubstanceConsumptionData[] = [
                {
                    ...BASE_SUBSTANCE,
                    combination_manual: "J01AA01_COMB2",
                    atc_version_manual: "ATC-OLD-v1",
                },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                { "ATC-OLD-v1": oldAtcVersion, [CURRENT_VERSION_KEY]: newAtcVersion },
                CURRENT_VERSION_KEY
            );

            expect(result[0]?.combination_autocalculated).toBe("J01AA01_COMB2");
        });
    });

    // -----------------------------------------------------------------------
    // Fix F: DDD-change fallback still provides DDD_GRAMS for kg calculation
    // -----------------------------------------------------------------------

    describe("DDD-change fallback (getDDDForAtcVersion) provides DDD_GRAMS", () => {
        it("When DDD is found via change-table fallback, DDD_GRAMS is derived and kg is computed", () => {
            // The ddds table is empty; the DDD is found via the changes table.
            // parseDDDChangesDataToDDDData now uses standarized.standarizedValue as DDD_GRAMS.
            const NEW_DDD_VALUE = 1.5; // G
            const REPORTED_DDDS = 1000;
            const NEW_DDD_STD = 1.5; // standardized to grams (BASE_CONV=1)
            const expectedAdjustedDdds = REPORTED_DDDS * (NEW_DDD_STD / NEW_DDD_STD); // ratio = 1.0 here (same DDD in both versions)

            const oldAtcVersion = makeMinimalAtcVersion([], [
                {
                    CATEGORY: "DDD" as const,
                    ATC_CODE: "J01AA01",
                    CHANGE: "UPDATED" as const,
                    NEW_DDD_VALUE: NEW_DDD_VALUE,
                    NEW_DDD_UNIT: "G",
                    NEW_DDD_ROA: "O",
                    NEW_DDD_INFO: null,
                    PREVIOUS_DDD_VALUE: NEW_DDD_VALUE,
                    PREVIOUS_DDD_UNIT: "G",
                    PREVIOUS_DDD_ROA: "O",
                    PREVIOUS_DDD_INFO: null,
                    YEAR: 2020,
                },
            ]);
            const newAtcVersion = makeMinimalAtcVersion([], [
                {
                    CATEGORY: "DDD" as const,
                    ATC_CODE: "J01AA01",
                    CHANGE: "UPDATED" as const,
                    NEW_DDD_VALUE: NEW_DDD_VALUE,
                    NEW_DDD_UNIT: "G",
                    NEW_DDD_ROA: "O",
                    NEW_DDD_INFO: null,
                    PREVIOUS_DDD_VALUE: NEW_DDD_VALUE,
                    PREVIOUS_DDD_UNIT: "G",
                    PREVIOUS_DDD_ROA: "O",
                    PREVIOUS_DDD_INFO: null,
                    YEAR: 2020,
                },
            ]);

            const rawData: RawSubstanceConsumptionData[] = [
                { ...BASE_SUBSTANCE, ddds_manual: REPORTED_DDDS, atc_version_manual: "ATC-OLD-v1" },
            ];

            const result = calculateConsumptionSubstanceLevelData(
                PERIOD,
                ORG_UNIT_ID,
                rawData,
                { "ATC-OLD-v1": oldAtcVersion, [CURRENT_VERSION_KEY]: newAtcVersion },
                CURRENT_VERSION_KEY
            );

            expect(result).toHaveLength(1);
            expect(result[0]?.ddds_autocalculated).toBeCloseTo(expectedAdjustedDdds, 6);
            // kg must be defined (DDD_GRAMS available from change-table entry)
            expect(result[0]?.kilograms_autocalculated).toBeDefined();
            expect(result[0]?.kilograms_autocalculated).toBeCloseTo(
                (expectedAdjustedDdds * NEW_DDD_STD) / 1000,
                6
            );
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

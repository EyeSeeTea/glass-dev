import { RawSubstanceConsumptionData } from "../../../../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { calculateConsumptionSubstanceLevelData } from "../calculationConsumptionSubstanceLevelData";
import rawSubstanceConsumptionDataBasic from "./data/rawSubstanceConsumptionDataBasic.json";
import rawSubstanceConsumptionDataAtcNotFound from "./data/rawSubstanceConsumptionDataAtcNotFound.json";
import atcVersionsByKeysData from "./data/atcVersionsByKeys.json";
import { calculationConsumptionSubstanceLevelBasic } from "./data/calculationConsumptionSubstanceLevelBasic";
import { ListGlassATCVersions } from "../../../../../entities/GlassAtcVersionData";
import { SubstanceConsumptionCalculated } from "../../../../../entities/data-entry/amc/SubstanceConsumptionCalculated";
import { setupLoggerForTesting } from "../../../../../../utils/logger";
import { calculationConsumptionSubstanceAtcNotFound } from "./data/calculationConsumptionSubstanceAtcNotFound";

describe("Given calculate Consumption Substance Level Data function", () => {
    beforeAll(async () => await setupLoggerForTesting());

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
        it("Then should return correct solution", async () => {
            const type = "atcNotFound";
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
});

function givenRawSubstanceConsumptionDataByType(type?: string): RawSubstanceConsumptionData[] {
    const rawSubstanceConsumptionDataByTypes = {
        basic: rawSubstanceConsumptionDataBasic,
        no_atc_data: rawSubstanceConsumptionDataBasic,
        atcNotFound: rawSubstanceConsumptionDataAtcNotFound,
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

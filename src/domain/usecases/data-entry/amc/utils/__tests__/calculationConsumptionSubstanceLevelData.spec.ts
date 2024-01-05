import { RawSubstanceConsumptionData } from "../../../../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { calculateConsumptionSubstanceLevelData } from "../calculationConsumptionSubstanceLevelData";
import rawSubstanceConsumptionDataBasic from "./data/rawSubstanceConsumptionDataBasic.json";
import rawSubstanceConsumptionDataAtcNotFound from "./data/rawSubstanceConsumptionDataAtcNotFound.json";
import atcVersionsByKeysData from "./data/atcVersionsByKeys.json";
import calculationConsumptionSubstanceLevelBasic from "./data/calculationConsumptionSubstanceLevelBasic.json";
import { ListGlassATCVersions } from "../../../../../entities/GlassATC";
import { SubstanceConsumptionCalculated } from "../../../../../entities/data-entry/amc/SubstanceConsumptionCalculated";

describe("Given calculate Consumption Substance Level Data function", () => {
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
});

function givenRawSubstanceConsumptionDataByType(type?: string): RawSubstanceConsumptionData[] {
    const rawSubstanceConsumptionDataByTypes = {
        basic: rawSubstanceConsumptionDataBasic,
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
        atcNotFound: calculationConsumptionSubstanceLevelBasic,
    } as Record<string, SubstanceConsumptionCalculated[]>;

    const calculationSolution = type ? calculationSolutionTypes[type] : calculationSolutionTypes.basic;

    return calculationSolution as SubstanceConsumptionCalculated[];
}

function verifyCalculationResult(result: any[], type?: string) {
    const expectedSolution: any[] = getExpectedCalculationSolution(type);

    expect(result?.length).toBe(expectedSolution?.length);

    result.forEach((calculation, index) => {
        const expectedCalculation = expectedSolution[index];
        expect(calculation.eventId).toBe(expectedCalculation?.eventId);
        expect(calculation.atc_manual).toBe(expectedCalculation?.atc_manual);
        expect(calculation.route_admin_manual).toBe(expectedCalculation?.route_admin_manual);
        expect(calculation.salt_manual).toBe(expectedCalculation?.salt_manual);
        expect(calculation.packages_manual).toBe(expectedCalculation?.packages_manual);
        expect(calculation.ddds_manual).toBe(expectedCalculation?.ddds_manual);
        expect(calculation.atc_version_manual).toBe(expectedCalculation?.atc_version_manual);
        expect(calculation.tons_manual).toBe(expectedCalculation?.tons_manual);
        expect(calculation.data_status_autocalculated).toBe(expectedCalculation?.data_status_autocalculated);
        expect(calculation.health_sector_autocalculated).toBe(expectedCalculation?.health_sector_autocalculated);
        expect(calculation.atc_version_autocalculated).toBe(expectedCalculation?.atc_version_autocalculated);
        expect(calculation.health_level_autocalculated).toBe(expectedCalculation?.health_level_autocalculated);
        expect(calculation.period).toBe(expectedCalculation?.period);
        expect(calculation.orgUnitId).toBe(expectedCalculation?.orgUnitId);
        expect(calculation.ddds_adjust).toBe(expectedCalculation?.ddds_adjust);
    });
}

import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";
import { RawSubstanceConsumptionData } from "../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { SubstanceConsumptionCalculated } from "../../entities/data-entry/amc/SubstanceConsumptionCalculated";
import { ImportStrategy } from "../../entities/data-entry/DataValuesSaveSummary";
import { ImportSummary } from "../../entities/data-entry/ImportSummary";

export interface AMCSubstanceDataRepository {
    validate(
        file: File,
        rawSubstanceDataColumns: string[]
    ): FutureData<{ isValid: boolean; rows: number; specimens: string[] }>;
    getRawSubstanceConsumptionDataByEventsIds(
        orgUnitId: Id,
        eventsIds: Id[]
    ): FutureData<RawSubstanceConsumptionData[] | undefined>;
    importCalculations(
        importStrategy: ImportStrategy,
        orgUnitId: Id,
        calculatedConsumptionSubstanceLevelData: SubstanceConsumptionCalculated[]
    ): FutureData<{
        importSummary: ImportSummary;
        eventIdList: string[];
    }>;
    getAllRawSubstanceConsumptionDataByByPeriod(
        orgUnitId: Id,
        period: string
    ): FutureData<RawSubstanceConsumptionData[] | undefined>;
    getAllCalculatedSubstanceConsumptionDataByByPeriod(
        orgUnitId: Id,
        period: string
    ): FutureData<SubstanceConsumptionCalculated[] | undefined>;
}

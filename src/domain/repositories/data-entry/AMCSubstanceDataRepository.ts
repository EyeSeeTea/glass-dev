import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";
import { RawSubstanceConsumptionData } from "../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { SubstanceConsumptionCalculated } from "../../entities/data-entry/amc/SubstanceConsumptionCalculated";
import { ImportStrategy } from "../../entities/data-entry/DataValuesSaveSummary";

export interface AMCSubstanceDataRepository {
    validate(
        file: File,
        rawSubstanceDataColumns: string[]
    ): FutureData<{ isValid: boolean; rows: number; specimens: string[] }>;
    getRawSubstanceConsumptionDataByEventsIds(
        orgUnitId: Id,
        substanceIds: Id[],
        substanceIdsChunkSize: number,
        chunked?: boolean
    ): FutureData<RawSubstanceConsumptionData[] | undefined>;
    importCalculations(
        importStrategy: ImportStrategy,
        orgUnitId: Id,
        calculatedConsumptionSubstanceLevelData: SubstanceConsumptionCalculated[]
    ): FutureData<{ response: TrackerPostResponse; eventIdLineNoMap: { id: string; lineNo: number }[] }>;
    getAllRawSubstanceConsumptionDataByByPeriod(
        orgUnitId: Id,
        period: string
    ): FutureData<RawSubstanceConsumptionData[] | undefined>;
    getAllCalculatedSubstanceConsumptionDataByByPeriod(
        orgUnitId: Id,
        period: string
    ): FutureData<SubstanceConsumptionCalculated[] | undefined>;
}

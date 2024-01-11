import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";
import { RawSubstanceConsumptionData } from "../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { SubstanceConsumptionCalculated } from "../../entities/data-entry/amc/SubstanceConsumptionCalculated";

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
        orgUnitId: Id,
        orgUnitName: string,
        calculatedConsumptionSubstanceLevelData: SubstanceConsumptionCalculated[]
    ): FutureData<{ response: TrackerPostResponse; eventIdLineNoMap: { id: string; lineNo: number }[] }>;
}

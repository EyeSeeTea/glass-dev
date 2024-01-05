import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";
import { RawSubstanceConsumptionData } from "../../entities/data-entry/amc/RawSubstanceConsumptionData";

export interface AMCSubstanceDataRepository {
    validate(
        file: File,
        rawSubstanceDataColumns: string[]
    ): FutureData<{ isValid: boolean; rows: number; specimens: string[] }>;
    getRawSubstanceConsumptionDataByEventsIds(
        orgUnitId: Id,
        eventsIds: Id[]
    ): FutureData<RawSubstanceConsumptionData[] | undefined>;
}

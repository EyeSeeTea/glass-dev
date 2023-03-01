import { DataValue } from "../entities/data-entry/DataValue";
import { DataValuesSaveSummary } from "../entities/data-entry/DataValuesSaveSummary";
import { FutureData } from "../entities/Future";

export interface DataValuesRepository {
    save(dataValues: DataValue[]): FutureData<DataValuesSaveSummary>;
}

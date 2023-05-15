import { DataValue } from "../../entities/data-entry/DataValue";
import { DataValuesSaveSummary, ImportStrategy } from "../../entities/data-entry/DataValuesSaveSummary";
import { FutureData } from "../../entities/Future";

export interface DataValuesRepository {
    save(dataValues: DataValue[], action: ImportStrategy, dryRun: boolean): FutureData<DataValuesSaveSummary>;
}

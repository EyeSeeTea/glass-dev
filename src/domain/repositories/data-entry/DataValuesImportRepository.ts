import { DataValue } from "../../entities/data-entry/DataValue";
import { DataValuesSaveSummary, ImportStrategy } from "../../entities/data-entry/DataValuesSaveSummary";

export interface DataValuesImportRepository {
    save(dataValues: DataValue[], action: ImportStrategy, dryRun: boolean): Promise<DataValuesSaveSummary>;
}

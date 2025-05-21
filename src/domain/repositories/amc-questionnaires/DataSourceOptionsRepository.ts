import { DataSourceOption } from "../../entities/amc-questionnaires/DataSourceOption";
import { FutureData } from "../../entities/Future";

export interface DataSourceOptionsRepository {
    get(): FutureData<DataSourceOption[]>;
}

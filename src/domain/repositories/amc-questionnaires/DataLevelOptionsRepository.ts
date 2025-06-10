import { DataLevelOption } from "../../entities/amc-questionnaires/DataLevelOption";
import { FutureData } from "../../entities/Future";

export interface DataLevelOptionsRepository {
    get(): FutureData<DataLevelOption[]>;
}

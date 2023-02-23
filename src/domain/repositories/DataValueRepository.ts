import { Id } from "../entities/Base";
import { DataValue, Period } from "../entities/DataValue";

export interface DataValueRepository {
    get(options: { dataSetId: Id; orgUnitId: Id; period: Period }): Promise<DataValue[]>;
    save(dataValue: DataValue): Promise<void>;
}

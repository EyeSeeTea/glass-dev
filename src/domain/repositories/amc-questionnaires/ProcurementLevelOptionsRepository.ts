import { ProcurementLevelOption } from "../../entities/amc-questionnaires/ProcurementLevelOption";
import { FutureData } from "../../entities/Future";

export interface ProcurementLevelOptionsRepository {
    get(): FutureData<ProcurementLevelOption[]>;
}

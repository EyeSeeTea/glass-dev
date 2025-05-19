import { HealthLevelOption } from "../../entities/amc-questionnaires/HealthLevelOption";
import { FutureData } from "../../entities/Future";

export interface HealthLevelOptionsRepository {
    get(): FutureData<HealthLevelOption[]>;
}

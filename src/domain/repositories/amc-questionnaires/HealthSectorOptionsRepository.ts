import { HealthSectorOption } from "../../entities/amc-questionnaires/HealthSectorOption";
import { FutureData } from "../../entities/Future";

export interface HealthSectorOptionsRepository {
    get(): FutureData<HealthSectorOption[]>;
}

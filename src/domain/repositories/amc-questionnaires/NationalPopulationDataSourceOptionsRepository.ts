import { NationalPopulationDataSourceOption } from "../../entities/amc-questionnaires/NationalPopulationDataSourceOption";
import { FutureData } from "../../entities/Future";

export interface NationalPopulationDataSourceOptionsRepository {
    get(): FutureData<NationalPopulationDataSourceOption[]>;
}

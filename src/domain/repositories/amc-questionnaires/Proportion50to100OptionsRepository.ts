import { Proportion50to100Option } from "../../entities/amc-questionnaires/Proportion50to100Option";
import { FutureData } from "../../entities/Future";

export interface Proportion50to100OptionsRepository {
    get(): FutureData<Proportion50to100Option[]>;
}

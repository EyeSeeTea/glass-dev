import { Proportion50to100UnknownOption } from "../../entities/amc-questionnaires/Proportion50to100UnknownOption";
import { FutureData } from "../../entities/Future";

export interface Proportion50to100UnknownOptionsRepository {
    get(): FutureData<Proportion50to100UnknownOption[]>;
}

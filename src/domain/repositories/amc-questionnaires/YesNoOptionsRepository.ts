import { YesNoOption } from "../../entities/amc-questionnaires/YesNoOption";
import { FutureData } from "../../entities/Future";

export interface YesNoOptionsRepository {
    get(): FutureData<YesNoOption[]>;
}

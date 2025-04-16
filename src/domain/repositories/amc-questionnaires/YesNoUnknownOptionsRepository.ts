import { YesNoUnknownOption } from "../../entities/amc-questionnaires/YesNoUnknownOption";
import { FutureData } from "../../entities/Future";

export interface YesNoUnknownOptionsRepository {
    get(): FutureData<YesNoUnknownOption[]>;
}

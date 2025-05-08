import { YesNoUnknownNAOption } from "../../entities/amc-questionnaires/YesNoUnknownNAOption";
import { FutureData } from "../../entities/Future";

export interface YesNoUnknownNAOptionsRepository {
    get(): FutureData<YesNoUnknownNAOption[]>;
}

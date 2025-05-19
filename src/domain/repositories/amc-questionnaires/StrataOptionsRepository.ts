import { StrataOption } from "../../entities/amc-questionnaires/StrataOption";
import { FutureData } from "../../entities/Future";

export interface StrataOptionsRepository {
    get(): FutureData<StrataOption[]>;
}

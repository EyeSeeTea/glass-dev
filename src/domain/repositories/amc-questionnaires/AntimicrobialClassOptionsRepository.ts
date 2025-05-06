import { AntimicrobialClassOption } from "../../entities/amc-questionnaires/AntimicrobialClassOption";
import { FutureData } from "../../entities/Future";

export interface AntimicrobialClassOptionsRepository {
    get(): FutureData<AntimicrobialClassOption[]>;
}

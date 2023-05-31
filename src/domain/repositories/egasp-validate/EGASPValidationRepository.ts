import { FutureData } from "../../entities/Future";
import { EGASPProgramMetadata } from "../../entities/egasp-validate/eventEffectTypes";

export interface EGASPValidationRepository {
    getMetadata(): FutureData<EGASPProgramMetadata>;
}

import { FutureData } from "../../entities/Future";
import { EGASPProgramMetadata } from "../../entities/program-rules/EventEffectTypes";

export interface ProgramRulesMetadataRepository {
    getMetadata(): FutureData<EGASPProgramMetadata>;
}

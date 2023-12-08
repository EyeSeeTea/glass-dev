import { FutureData } from "../../entities/Future";
import { EventProgramBLMetadata } from "../../entities/program-rules/EventEffectTypes";

export interface ProgramRulesMetadataRepository {
    getMetadata(programId: string): FutureData<EventProgramBLMetadata>;
}

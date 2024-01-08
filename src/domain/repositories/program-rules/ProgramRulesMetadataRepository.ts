import { FutureData } from "../../entities/Future";
import { BulkLoadMetadata } from "../../entities/program-rules/EventEffectTypes";

export interface ProgramRulesMetadataRepository {
    getMetadata(programId: string): FutureData<BulkLoadMetadata>;
}

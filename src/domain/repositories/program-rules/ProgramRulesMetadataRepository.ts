import { D2TrackerTrackedEntity } from "@eyeseetea/d2-api/api/trackerTrackedEntities";
import { FutureData } from "../../entities/Future";
import { BulkLoadMetadata } from "../../entities/program-rules/EventEffectTypes";

export interface ProgramRulesMetadataRepository {
    getMetadata(programId: string): FutureData<BulkLoadMetadata>;
    getTEIs(programId: string, orgUnitId: string): FutureData<D2TrackerTrackedEntity[]>;
}

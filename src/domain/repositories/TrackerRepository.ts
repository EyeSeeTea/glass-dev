import { TrackerPostRequest, TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { FutureData } from "../entities/Future";
import { ImportStrategy } from "../entities/data-entry/DataValuesSaveSummary";
import { Id } from "../entities/Ref";

export interface TrackerRepository {
    import(req: TrackerPostRequest, action: ImportStrategy): FutureData<TrackerPostResponse>;
    getProgramMetadata(programID: string, programStageId: string): FutureData<any>;
    getExistingTrackedEntitiesIdsByIds(trackEntitiesIds: Id[], programId: Id): FutureData<Id[]>;
    getExistingEventsIdsByIds(eventIds: Id[], programId: Id): FutureData<Id[]>;
}

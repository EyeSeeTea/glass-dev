import { TrackerPostRequest, TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { FutureData } from "../entities/Future";
import { ImportStrategy } from "../entities/data-entry/DataValuesSaveSummary";

export interface TrackerRepository {
    import(req: TrackerPostRequest, action: ImportStrategy): FutureData<TrackerPostResponse>;
    getProgramMetadata(programID: string, programStageId: string): FutureData<any>;
}

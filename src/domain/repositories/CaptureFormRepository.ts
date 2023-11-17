import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";
import { FutureData } from "../entities/Future";
import { Questionnaire } from "../entities/Questionnaire";
import { Id } from "../entities/Ref";

export interface CaptureFormRepository {
    getForm(programId: Id): FutureData<Questionnaire>;
    getPopulatedForm(event: D2TrackerEvent, programId: string): FutureData<Questionnaire>;
    getSignalEvent(eventId: string): FutureData<D2TrackerEvent>;
}

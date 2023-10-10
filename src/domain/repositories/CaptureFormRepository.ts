import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";
import { FutureData } from "../entities/Future";
import { Questionnaire } from "../entities/Questionnaire";

export interface CaptureFormRepository {
    getForm(): FutureData<Questionnaire>;
    getPopulatedForm(event: D2TrackerEvent): FutureData<Questionnaire>;
    getSignalEvent(eventId: string): FutureData<D2TrackerEvent>;
}

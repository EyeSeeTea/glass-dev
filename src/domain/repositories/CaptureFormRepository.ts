import { Event } from "../../data/repositories/Dhis2EventsDefaultRepository";
import { FutureData } from "../entities/Future";
import { Questionnaire } from "../entities/Questionnaire";

export interface CaptureFormRepository {
    getForm(): FutureData<Questionnaire>;
    getPopulatedForm(event: Event): FutureData<Questionnaire>;
    getSignalEvent(eventId: string): FutureData<Event>;
}

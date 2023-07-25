import { FutureData } from "../entities/Future";
import { Question, Questionnaire } from "../entities/Questionnaire";

export interface CaptureFormRepository {
    getForm(): FutureData<Questionnaire>;
}

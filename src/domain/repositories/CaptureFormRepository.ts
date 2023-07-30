import { FutureData } from "../entities/Future";
import { Questionnaire } from "../entities/Questionnaire";

export interface CaptureFormRepository {
    getForm(): FutureData<Questionnaire>;
}

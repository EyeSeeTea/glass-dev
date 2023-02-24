import { Id } from "../entities/Base";
import { FutureData } from "../entities/Future";
import { GlassModule } from "../entities/GlassModule";
import {
    Questionnaire,
    QuestionnaireQuestion,
    QuestionnaireSelector,
    QuestionnaireSimple,
} from "../entities/Questionnaire";

export interface QuestionnaireRepository {
    getMany(module: GlassModule, options: { orgUnitId: Id; year: number }): FutureData<QuestionnaireSimple[]>;
    get(module: GlassModule, selector: QuestionnaireSelector): FutureData<Questionnaire>;
    setCompletion(questionnaire: QuestionnaireSelector, value: boolean): FutureData<void>;
    saveResponse(questionnaire: QuestionnaireSelector, question: QuestionnaireQuestion): FutureData<void>;
}

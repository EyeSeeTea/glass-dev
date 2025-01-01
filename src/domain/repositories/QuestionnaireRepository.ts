import { Id } from "../entities/Base";
import { FutureData } from "../entities/Future";
import { GlassModule } from "../entities/GlassModule";
import { Questionnaire, Question, QuestionnaireSelector, QuestionnaireBase } from "../entities/Questionnaire";

export interface QuestionnaireRepository {
    getDatasetList(
        module: GlassModule,
        options: { orgUnitId: Id; year: string },
        captureAccess: boolean
    ): FutureData<QuestionnaireBase[]>;
    getProgramList(module: GlassModule, options: { orgUnitId: Id; year: string }): FutureData<QuestionnaireBase[]>;
    get(module: GlassModule, selector: QuestionnaireSelector, captureAccess: boolean): FutureData<Questionnaire>;
    setCompletion(questionnaire: QuestionnaireSelector, value: boolean): FutureData<void>;
    saveResponse(questionnaire: QuestionnaireSelector, questions: Question[]): FutureData<void>;
}

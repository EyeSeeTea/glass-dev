import { AMCQuestionnaireQuestions } from "../../entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { FutureData } from "../../entities/Future";

export interface QuestionsAMCQuestionnaireRepository {
    get(): FutureData<AMCQuestionnaireQuestions>;
}

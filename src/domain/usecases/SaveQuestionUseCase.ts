import { Question, QuestionnaireSelector } from "../entities/Questionnaire";
import { QuestionnaireRepository } from "../repositories/QuestionnaireRepository";

export class SaveQuestionnaireResponseUseCase {
    constructor(private questionnaireReposotory: QuestionnaireRepository) {}

    execute(questionnaire: QuestionnaireSelector, questions: Question[]) {
        return this.questionnaireReposotory.saveResponse(questionnaire, questions);
    }
}

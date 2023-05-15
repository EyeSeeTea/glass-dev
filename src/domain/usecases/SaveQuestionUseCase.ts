import { Question, QuestionnaireSelector } from "../entities/Questionnaire";
import { QuestionnaireRepository } from "../repositories/QuestionnaireRepository";

export class SaveQuestionnaireResponseUseCase {
    constructor(private questionnaireReposotory: QuestionnaireRepository) {}

    execute(questionnaire: QuestionnaireSelector, question: Question) {
        return this.questionnaireReposotory.saveResponse(questionnaire, question);
    }
}

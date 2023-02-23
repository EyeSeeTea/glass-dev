import { QuestionnaireQuestion, QuestionnaireSelector } from "../entities/Questionnaire";
import { QuestionnaireRepository } from "../repositories/QuestionnaireRepository";

export class SaveQuestionnaireResponseUseCase {
    constructor(private questionnaireReposotory: QuestionnaireRepository) {}

    execute(questionnaire: QuestionnaireSelector, question: QuestionnaireQuestion) {
        return this.questionnaireReposotory.saveResponse(questionnaire, question);
    }
}

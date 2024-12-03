import { Question, QuestionnaireSelector } from "../entities/Questionnaire";
import { QuestionnaireRepository } from "../repositories/QuestionnaireRepository";

export class SaveQuestionnaireResponseUseCase {
    constructor(private questionnaireRepository: QuestionnaireRepository) {}

    execute(questionnaire: QuestionnaireSelector, questions: Question[]) {
        return this.questionnaireRepository.saveResponse(questionnaire, questions);
    }
}

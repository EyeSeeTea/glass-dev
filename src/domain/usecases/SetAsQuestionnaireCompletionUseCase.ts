import { FutureData } from "../entities/Future";
import { QuestionnaireSelector } from "../entities/Questionnaire";
import { QuestionnaireRepository } from "../repositories/QuestionnaireRepository";

export class SetAsQuestionnaireCompletionUseCase {
    constructor(private questionnaireRepository: QuestionnaireRepository) {}

    execute(selector: QuestionnaireSelector, value: boolean): FutureData<void> {
        return this.questionnaireRepository.setCompletion(selector, value);
    }
}

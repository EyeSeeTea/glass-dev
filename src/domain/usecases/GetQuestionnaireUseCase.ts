import { GlassModule } from "../entities/GlassModule";
import { QuestionnaireSelector } from "../entities/Questionnaire";
import { QuestionnaireRepository } from "../repositories/QuestionnaireRepository";

export class GetQuestionnaireUseCase {
    constructor(private questionnaireRepository: QuestionnaireRepository) {}

    execute(module: GlassModule, selector: QuestionnaireSelector, captureAccess: boolean) {
        return this.questionnaireRepository.get(module, selector, captureAccess);
    }
}

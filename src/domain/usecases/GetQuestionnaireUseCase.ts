import { Id } from "../entities/Base";
import { GlassModule } from "../entities/GlassModule";
import { QuestionnaireRepository } from "../repositories/QuestionnaireRepository";

export class GetQuestionnaireUseCase {
    constructor(private questionnaireRepository: QuestionnaireRepository) {}

    execute(module: GlassModule, options: { id: Id; orgUnitId: Id; year: number }) {
        return this.questionnaireRepository.get(module, options);
    }
}

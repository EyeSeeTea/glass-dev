import { Id } from "../entities/Base";
import { GlassModule } from "../entities/GlassModule";
import { QuestionnaireRepository } from "../repositories/QuestionnaireRepository";

export class GetQuestionnaireListUseCase {
    constructor(private questionnaireRepository: QuestionnaireRepository) {}

    execute(module: GlassModule, options: { orgUnitId: Id; year: number }) {
        return this.questionnaireRepository.getList(module, options);
    }
}

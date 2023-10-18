import { Id } from "../entities/Base";
import { GlassModule } from "../entities/GlassModule";
import { QuestionnaireRepository } from "../repositories/QuestionnaireRepository";

export class GetQuestionnaireListUseCase {
    constructor(private questionnaireRepository: QuestionnaireRepository) {}

    execute(module: GlassModule, options: { orgUnitId: Id; year: string }, captureAccess: boolean) {
        if (module.questionnairesType === "Dataset")
            return this.questionnaireRepository.getDatasetList(module, options, captureAccess);
        else return this.questionnaireRepository.getProgramList(module, options);
    }
}

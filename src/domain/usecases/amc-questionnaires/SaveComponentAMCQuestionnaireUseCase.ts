import { UseCase } from "../../../CompositionRoot";
import { AMCQuestionnaire } from "../../entities/amc-questionnaires/AMCQuestionnaire";
import { ComponentAMCQuestionnaire } from "../../entities/amc-questionnaires/ComponentAMCQuestionnaire";
import { Future, FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";
import { AMCQuestionnaireRepository } from "../../repositories/amc-questionnaires/AMCQuestionnaireRepository";

export class SaveComponentAMCQuestionnaireUseCase implements UseCase {
    constructor(private amcQuestionnaireRepository: AMCQuestionnaireRepository) {}

    public execute(
        questionnaire: AMCQuestionnaire,
        componentAMCQuestionnaire: ComponentAMCQuestionnaire
    ): FutureData<Id> {
        const validationErrors = questionnaire.addOrUpdateComponentQuestionnaire(componentAMCQuestionnaire).match({
            error: errors => errors,
            success: () => [],
        });
        if (validationErrors.length > 0) {
            return Future.error(`Validation errors: ${validationErrors.join(", ")}`);
        }
        return this.amcQuestionnaireRepository.saveComponentQuestionnaire(questionnaire.id, componentAMCQuestionnaire);
    }
}

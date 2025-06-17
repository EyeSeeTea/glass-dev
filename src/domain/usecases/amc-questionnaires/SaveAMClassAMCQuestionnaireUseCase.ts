import { UseCase } from "../../../CompositionRoot";
import { AMClassAMCQuestionnaire } from "../../entities/amc-questionnaires/AMClassAMCQuestionnaire";
import { AMCQuestionnaire } from "../../entities/amc-questionnaires/AMCQuestionnaire";
import { Future, FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";
import { AMCQuestionnaireRepository } from "../../repositories/amc-questionnaires/AMCQuestionnaireRepository";

export class SaveAMClassAMCQuestionnaireUseCase implements UseCase {
    constructor(private amcQuestionnaireRepository: AMCQuestionnaireRepository) {}

    public execute(questionnaire: AMCQuestionnaire, amClassAMCQuestionnaire: AMClassAMCQuestionnaire): FutureData<Id> {
        const validationErrors = questionnaire.addOrUpdateAMClassQuestionnaire(amClassAMCQuestionnaire).match({
            error: errors => errors,
            success: () => [],
        });
        if (validationErrors.length > 0) {
            return Future.error(`Validation errors: ${validationErrors.join(", ")}`);
        }
        return this.amcQuestionnaireRepository.saveAMClassQuestionnaire(questionnaire.id, amClassAMCQuestionnaire);
    }
}

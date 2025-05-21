import { UseCase } from "../../../CompositionRoot";
import { ComponentAMCQuestionnaire } from "../../entities/amc-questionnaires/ComponentAMCQuestionnaire";
import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";
import { AMCQuestionnaireRepository } from "../../repositories/amc-questionnaires/AMCQuestionnaireRepository";

export class SaveComponentAMCQuestionnaireUseCase implements UseCase {
    constructor(private amcQuestionnaireRepository: AMCQuestionnaireRepository) {}

    public execute(questionnaireId: Id, componentAMCQuestionnaire: ComponentAMCQuestionnaire): FutureData<Id> {
        return this.amcQuestionnaireRepository.saveComponentQuestionnaire(questionnaireId, componentAMCQuestionnaire);
    }
}

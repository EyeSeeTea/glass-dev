import { UseCase } from "../../../CompositionRoot";
import { AMClassAMCQuestionnaire } from "../../entities/amc-questionnaires/AMClassAMCQuestionnaire";
import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";
import { AMCQuestionnaireRepository } from "../../repositories/amc-questionnaires/AMCQuestionnaireRepository";

export class SaveAMClassAMCQuestionnaireUseCase implements UseCase {
    constructor(private amcQuestionnaireRepository: AMCQuestionnaireRepository) {}

    public execute(questionnaireId: Id, amClassAMCQuestionnaire: AMClassAMCQuestionnaire): FutureData<Id> {
        return this.amcQuestionnaireRepository.saveAMClassQuestionnaire(questionnaireId, amClassAMCQuestionnaire);
    }
}

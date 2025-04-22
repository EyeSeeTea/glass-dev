import { UseCase } from "../../../CompositionRoot";
import { GeneralAMCQuestionnaire } from "../../entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";
import { GeneralAMCQuestionnaireRepository } from "../../repositories/amc-questionnaires/GeneralAMCQuestionnaireRepository";

export class SaveGeneralAMCQuestionnaireUseCase implements UseCase {
    constructor(private generalAMCQuestionnaireRepository: GeneralAMCQuestionnaireRepository) {}

    public execute(generalAMCQuestionnaire: GeneralAMCQuestionnaire): FutureData<Id> {
        return this.generalAMCQuestionnaireRepository.save(generalAMCQuestionnaire);
    }
}

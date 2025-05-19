import { UseCase } from "../../../CompositionRoot";
import { GeneralAMCQuestionnaire } from "../../entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";
import { AMCQuestionnaireRepository } from "../../repositories/amc-questionnaires/AMCQuestionnaireRepository";

export class SaveGeneralAMCQuestionnaireUseCase implements UseCase {
    constructor(private generalAMCQuestionnaireRepository: AMCQuestionnaireRepository) {}

    public execute(generalAMCQuestionnaire: GeneralAMCQuestionnaire): FutureData<Id> {
        return this.generalAMCQuestionnaireRepository.save(generalAMCQuestionnaire);
    }
}

import { UseCase } from "../../../CompositionRoot";
import { GeneralAMCQuestionnaire } from "../../entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { Id } from "../../entities/Base";
import { FutureData } from "../../entities/Future";
import { GeneralAMCQuestionnaireRepository } from "../../repositories/amc-questionnaires/GeneralAMCQuestionnaireRepository";

export class GetGeneralAMCQuestionnaireByIdUseCase implements UseCase {
    constructor(private generalAMCQuestionnaireRepository: GeneralAMCQuestionnaireRepository) {}

    public execute(id: Id, orgUnitId: Id, period: string): FutureData<GeneralAMCQuestionnaire> {
        return this.generalAMCQuestionnaireRepository.getById(id, orgUnitId, period);
    }
}

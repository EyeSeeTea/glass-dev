import { UseCase } from "../../../CompositionRoot";
import { GeneralAMCQuestionnaire } from "../../entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { Id } from "../../entities/Base";
import { FutureData } from "../../entities/Future";
import { GeneralAMCQuestionnaireRepository } from "../../repositories/amc-questionnaires/GeneralAMCQuestionnaireRepository";

export class GetGeneralAMCQuestionnaireUseCase implements UseCase {
    constructor(private generalAMCQuestionnaireRepository: GeneralAMCQuestionnaireRepository) {}

    public execute(id: Id, orgUnitId: Id, period: string): FutureData<GeneralAMCQuestionnaire> {
        return this.generalAMCQuestionnaireRepository.get(id, orgUnitId, period);
    }
}

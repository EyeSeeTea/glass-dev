import { UseCase } from "../../../CompositionRoot";
import { AMCQuestionnaire } from "../../entities/amc-questionnaires/AMCQuestionnaire";
import { Id } from "../../entities/Base";
import { FutureData } from "../../entities/Future";
import { AMCQuestionnaireRepository } from "../../repositories/amc-questionnaires/AMCQuestionnaireRepository";

export class GetAMCQuestionnaireByIdUseCase implements UseCase {
    constructor(private amcQuestionnaireRepository: AMCQuestionnaireRepository) {}

    public execute(id: Id, orgUnitId: Id, period: string): FutureData<AMCQuestionnaire> {
        return this.amcQuestionnaireRepository.getById(id, orgUnitId, period);
    }
}

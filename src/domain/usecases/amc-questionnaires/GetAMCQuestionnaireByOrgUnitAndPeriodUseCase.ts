import { UseCase } from "../../../CompositionRoot";
import { Maybe } from "../../../types/utils";
import { AMCQuestionnaire } from "../../entities/amc-questionnaires/AMCQuestionnaire";
import { Id } from "../../entities/Base";
import { FutureData } from "../../entities/Future";
import { AMCQuestionnaireRepository } from "../../repositories/amc-questionnaires/AMCQuestionnaireRepository";

export class GetAMCQuestionnaireByOrgUnitAndPeriodUseCase implements UseCase {
    constructor(private amcQuestionnaireRepository: AMCQuestionnaireRepository) {}

    public execute(orgUnitId: Id, period: string): FutureData<Maybe<AMCQuestionnaire>> {
        return this.amcQuestionnaireRepository.getByOrgUnitAndPeriod(orgUnitId, period);
    }
}

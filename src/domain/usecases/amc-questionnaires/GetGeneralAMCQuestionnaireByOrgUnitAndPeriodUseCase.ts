import { UseCase } from "../../../CompositionRoot";
import { Maybe } from "../../../utils/ts-utils";
import { GeneralAMCQuestionnaire } from "../../entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { Id } from "../../entities/Base";
import { FutureData } from "../../entities/Future";
import { GeneralAMCQuestionnaireRepository } from "../../repositories/amc-questionnaires/GeneralAMCQuestionnaireRepository";

export class GetGeneralAMCQuestionnaireByOrgUnitAndPeriodUseCase implements UseCase {
    constructor(private generalAMCQuestionnaireRepository: GeneralAMCQuestionnaireRepository) {}

    public execute(orgUnitId: Id, period: string): FutureData<Maybe<GeneralAMCQuestionnaire>> {
        return this.generalAMCQuestionnaireRepository.getByOrgUnitAndPeriod(orgUnitId, period);
    }
}

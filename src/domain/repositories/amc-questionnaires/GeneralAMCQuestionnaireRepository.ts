import { Maybe } from "../../../utils/ts-utils";
import { GeneralAMCQuestionnaire } from "../../entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";

export interface GeneralAMCQuestionnaireRepository {
    getById(id: Id, orgUnitId: Id, period: string): FutureData<GeneralAMCQuestionnaire>;
    getByOrgUnitAndPeriod(orgUnitId: Id, period: string): FutureData<Maybe<GeneralAMCQuestionnaire>>;
    save(generalAMCQuestionnaire: GeneralAMCQuestionnaire): FutureData<Id>;
}

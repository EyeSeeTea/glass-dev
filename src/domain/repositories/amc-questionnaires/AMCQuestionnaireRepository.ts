import { Maybe } from "../../../utils/ts-utils";
import { AMCQuestionnaire } from "../../entities/amc-questionnaires/AMCQuestionnaire";
import { GeneralAMCQuestionnaire } from "../../entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";

export interface AMCQuestionnaireRepository {
    getById(id: Id, orgUnitId: Id, period: string): FutureData<AMCQuestionnaire>;
    getByOrgUnitAndPeriod(orgUnitId: Id, period: string): FutureData<Maybe<AMCQuestionnaire>>;
    save(generalAMCQuestionnaire: GeneralAMCQuestionnaire): FutureData<Id>;
}

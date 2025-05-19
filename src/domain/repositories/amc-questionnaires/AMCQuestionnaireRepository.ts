import { Maybe } from "../../../utils/ts-utils";
import { AMClassAMCQuestionnaire } from "../../entities/amc-questionnaires/AMClassAMCQuestionnaire";
import { AMCQuestionnaire } from "../../entities/amc-questionnaires/AMCQuestionnaire";
import { ComponentAMCQuestionnaire } from "../../entities/amc-questionnaires/ComponentAMCQuestionnaire";
import { GeneralAMCQuestionnaire } from "../../entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";

export interface AMCQuestionnaireRepository {
    getById(id: Id, orgUnitId: Id, period: string): FutureData<AMCQuestionnaire>;
    getByOrgUnitAndPeriod(orgUnitId: Id, period: string): FutureData<Maybe<AMCQuestionnaire>>;
    save(generalAMCQuestionnaire: GeneralAMCQuestionnaire): FutureData<Id>;
    saveAMClassQuestionnaire(questionnaireId: Id, amClassAMCQuestionnaire: AMClassAMCQuestionnaire): FutureData<Id>;
    saveComponentQuestionnaire(
        questionnaireId: Id,
        componentAMCQuestionnaire: ComponentAMCQuestionnaire
    ): FutureData<Id>;
}

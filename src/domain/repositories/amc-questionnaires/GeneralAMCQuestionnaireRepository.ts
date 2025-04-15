import { GeneralAMCQuestionnaire } from "../../entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";

export interface GeneralAMCQuestionnaireRepository {
    get(id: Id, orgUnitId: Id, period: string): FutureData<GeneralAMCQuestionnaire>;
}

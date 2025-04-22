import { AMCQuestionnaireOptionsContextState } from "../../../contexts/amc-questionnaire-options-context";
import { FormState } from "../../form/presentation-entities/FormState";
import { mapFormStateToGeneralAMCQuestionnaire } from "./mapFormStateToGeneralAMCQuestionnaire";
import { QuestionnaireFormEntity } from "./presentation-entities/QuestionnaireFormEntity";

export function mapFormStateToEntity(params: {
    formState: FormState;
    formEntity: QuestionnaireFormEntity;
    orgUnitId: string;
    period: string;
    editMode: boolean;
    options: AMCQuestionnaireOptionsContextState;
}): QuestionnaireFormEntity["entity"] {
    const { formEntity } = params;
    switch (formEntity.type) {
        case "general-questionnaire": {
            return mapFormStateToGeneralAMCQuestionnaire(params);
        }
        default: {
            return formEntity.entity;
        }
    }
}

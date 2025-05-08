import { AMCQuestionnaireOptionsContextState } from "../../../contexts/amc-questionnaire-options-context";
import { FormOption } from "../../form/presentation-entities/FormOption";
import { FormState } from "../../form/presentation-entities/FormState";
import { mapGeneralAMCQuestionnaireToInitialFormState } from "./mapGeneralAMCQuestionnaireToInitialFormState";
import { QuestionnaireFormEntity } from "./presentation-entities/QuestionnaireFormEntity";

export function mapEntityToFormState(params: {
    questionnaireFormEntity: QuestionnaireFormEntity;
    editMode?: boolean;
    options: AMCQuestionnaireOptionsContextState;
    isViewOnlyMode?: boolean;
}): FormState {
    const { questionnaireFormEntity, editMode = false, options, isViewOnlyMode = false } = params;
    // TODO: when more questionnaire types are added, add them here with switch case
    return mapGeneralAMCQuestionnaireToInitialFormState({
        questionnaireFormEntity: questionnaireFormEntity,
        editMode,
        options,
        isViewOnlyMode,
    });
}

export function mapToFormOptions(
    options: AMCQuestionnaireOptionsContextState[keyof AMCQuestionnaireOptionsContextState]
): FormOption[] {
    return options.map(
        (option): FormOption => ({
            value: option.code,
            label: option.name,
        })
    );
}

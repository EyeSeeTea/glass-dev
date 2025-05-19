import { AMCQuestionnaire } from "../../../../../domain/entities/amc-questionnaires/AMCQuestionnaire";
import { antimicrobialClassOption } from "../../../../../domain/entities/amc-questionnaires/AntimicrobialClassOption";
import { strataOption } from "../../../../../domain/entities/amc-questionnaires/StrataOption";
import { AMCQuestionnaireOptionsContextState } from "../../../../contexts/amc-questionnaire-options-context";
import { FormFieldState } from "../../../form/presentation-entities/FormFieldsState";
import { getFieldByIdFromSections } from "../../../form/presentation-entities/FormSectionsState";
import { FormState, updateFormState } from "../../../form/presentation-entities/FormState";
import { mapToFormOptions } from "../mappers/mapperUtils";
import { QuestionnaireFormEntity } from "../presentation-entities/QuestionnaireFormEntity";

/**
 * Updates the Component questionnaire options based on the updated field
 * @todo: evaluate refactoring and moving this logic to other place
 */
export function updateComponentQuestionnaireFormOptions(
    updatedForm: FormState,
    updatedField: FormFieldState,
    questionnaireFormEntity: QuestionnaireFormEntity,
    questionnaire: AMCQuestionnaire,
    options: AMCQuestionnaireOptionsContextState
): FormState {
    if (questionnaireFormEntity.type !== "component-questionnaire") {
        return updatedForm;
    }
    if (updatedField.id === "antimicrobialClasses") {
        // TODO: Filter out amClasses incompatible (with empty componentStrata options)
        const strataField = getFieldByIdFromSections(updatedForm.sections, "componentStrata");
        if (strataField && "options" in strataField && !Array.isArray(strataField.value)) {
            const updatedAMClasses = _.compact(
                (updatedField.value as string[]).map(val => antimicrobialClassOption.getSafeValue(val))
            );
            const availableStrataOptions = questionnaire.getAvailableStrataOptionsForComponentQ(
                options.strataOptions,
                updatedAMClasses
            );
            const updatedValue = availableStrataOptions.some(option => option.code === strataField.value)
                ? (strataField.value as string)
                : "";
            return updateFormState(updatedForm, {
                ...strataField,
                options: mapToFormOptions(availableStrataOptions),
                value: updatedValue as any,
            });
        }
    }
    if (updatedField.id === "componentStrata") {
        const amClassField = getFieldByIdFromSections(updatedForm.sections, "antimicrobialClasses");
        if (amClassField && "options" in amClassField && Array.isArray(amClassField.value)) {
            const updatedStrataOption = strataOption.getSafeValue(updatedField.value as string);
            const availableAMClassOptions = questionnaire.getAvailableAMClassOptionsForComponentQ(
                options.antimicrobialClassOptions,
                updatedStrataOption
            );
            const updatedValue = amClassField.value.filter(code =>
                availableAMClassOptions.some(option => option.code === code)
            );
            return updateFormState(updatedForm, {
                ...amClassField,
                options: mapToFormOptions(availableAMClassOptions),
                value: updatedValue as any,
            });
        }
    }
    return updatedForm;
}

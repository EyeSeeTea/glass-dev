import { ValidationError } from "../../../../../domain/entities/amc-questionnaires/ValidationError";
import { QuestionnaireFormEntity } from "../../../current-data-submission/amc-questionnaires/presentation-entities/QuestionnaireFormEntity";
import { FormFieldState } from "../FormFieldsState";
import { getFieldByIdFromSections } from "../FormSectionsState";
import {
    FormState,
    updateFormStateAndApplySideEffects,
    updateFormStateWithFieldErrors,
    isValidForm,
    validateForm,
} from "../FormState";
import { applyRulesInFormState } from "./applyRulesInFormState";

export function updateAndValidateFormState(
    prevFormState: FormState,
    updatedField: FormFieldState,
    questionnaireFormEntity: QuestionnaireFormEntity
): FormState {
    const updatedForm = updateFormStateAndApplySideEffects(prevFormState, updatedField);

    const hasUpdatedFieldAnyRule =
        questionnaireFormEntity.rules.filter(rule =>
            "fieldIds" in rule ? rule.fieldIds.includes(updatedField.id) : rule.fieldId === updatedField.id
        ).length > 0;

    const updatedFormWithRulesApplied = hasUpdatedFieldAnyRule
        ? applyRulesInFormState(updatedForm, updatedField, questionnaireFormEntity.rules, "change")
        : updatedForm;

    const fieldValidationErrors = validateFormState(updatedFormWithRulesApplied, updatedField);

    // we need to keep the updated version of the updatedField in case it was also updated by rules
    const updatedFieldWithRulesApplied = getFieldByIdFromSections(
        updatedFormWithRulesApplied.sections,
        updatedField.id
    );
    if (!updatedFieldWithRulesApplied) {
        throw new Error(`Field with id ${updatedField.id} not found in updated form state.`);
    }
    const updatedFormStateWithErrors = updateFormStateWithFieldErrors(
        updatedFormWithRulesApplied,
        updatedFieldWithRulesApplied,
        fieldValidationErrors
    );

    return {
        ...updatedFormStateWithErrors,
        isValid: isValidForm(updatedFormStateWithErrors.sections),
    };
}

function validateFormState(updatedForm: FormState, updatedField: FormFieldState): ValidationError[] {
    const formValidationErrors = validateForm(updatedForm, updatedField);
    return formValidationErrors;
}

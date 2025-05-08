import { ValidationError } from "../../../../../domain/entities/amc-questionnaires/ValidationError";
import { QuestionnaireFormEntity } from "../../../current-data-submission/amc-questionnaires/presentation-entities/QuestionnaireFormEntity";
import { FormFieldState } from "../FormFieldsState";
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
        questionnaireFormEntity.rules.filter(rule => rule.fieldId === updatedField.id).length > 0;

    const updatedFormWithRulesApplied = hasUpdatedFieldAnyRule
        ? applyRulesInFormState(updatedForm, updatedField, questionnaireFormEntity.rules)
        : updatedForm;

    const fieldValidationErrors = validateFormState(updatedFormWithRulesApplied, updatedField);

    const updatedFormStateWithErrors = updateFormStateWithFieldErrors(
        updatedFormWithRulesApplied,
        updatedField,
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

import { ValidationError } from "../../../../domain/entities/amc-questionnaires/ValidationError";
import { Maybe } from "../../../../types/utils";
import { FormFieldState, isFieldInSection, updateFields, validateField } from "./FormFieldsState";

export type FormSectionState = {
    id: string;
    title?: string;
    isVisible?: boolean;
    required?: boolean;
    fields: FormFieldState[];
};

// HELPERS:

export function getFieldByIdFromSections(sectionsState: FormSectionState[], fieldId: string): Maybe<FormFieldState> {
    const section = sectionsState.find(section => section.fields.some(field => field.id === fieldId));
    return section?.fields.find(field => field.id === fieldId);
}

export function getFieldValueByIdFromSections(
    sectionsState: FormSectionState[],
    fieldId: string
): Maybe<FormFieldState["value"]> {
    return getFieldByIdFromSections(sectionsState, fieldId)?.value;
}

// UPDATES:

export function updateSections(
    formSectionsState: FormSectionState[],
    updatedField: FormFieldState,
    fieldValidationErrors?: ValidationError[]
): FormSectionState[] {
    return formSectionsState.map(section => {
        const hasToUpdateSection =
            isFieldInSection(section, updatedField) || updatedField.updateAllStateWithValidationErrors;

        return hasToUpdateSection ? updateSectionState(section, updatedField, fieldValidationErrors) : section;
    });
}

function updateSectionState(
    formSectionState: FormSectionState,
    updatedField: FormFieldState,
    fieldValidationErrors?: ValidationError[]
): FormSectionState {
    if (isFieldInSection(formSectionState, updatedField) || updatedField.updateAllStateWithValidationErrors) {
        return {
            ...formSectionState,
            fields: updateFields(formSectionState.fields, updatedField, fieldValidationErrors),
        };
    } else {
        return formSectionState;
    }
}

// VALIDATIONS:

export function validateSections(sections: FormSectionState[], updatedField: FormFieldState): ValidationError[] {
    return sections.flatMap(section => {
        return isFieldInSection(section, updatedField) ? validateSection(section, updatedField) : [];
    });
}

function validateSection(section: FormSectionState, updatedField: FormFieldState): ValidationError[] {
    return section.fields.flatMap(field => {
        if (field.id === updatedField.id) {
            return validateField(updatedField) || [];
        } else {
            return [];
        }
    });
}

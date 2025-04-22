import { ValidationError, ValidationErrorKey } from "../../../../domain/entities/amc-questionnaires/ValidationError";
import { FormFieldState, isFieldInSection, updateFields, validateField } from "./FormFieldsState";

import { FormRule } from "./FormRule";

export type FormSectionState = {
    id: string;
    title?: string;
    isVisible?: boolean;
    required?: boolean;
    fields: FormFieldState[];
};

// HELPERS:
export function getFieldValueByIdFromSections(
    sectionsState: FormSectionState[],
    fieldId: string
): FormFieldState["value"] | undefined {
    const section = sectionsState.find(section => section.fields.some(field => field.id === fieldId));
    return section?.fields.find(field => field.id === fieldId)?.value;
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

// RULES:

export function setRequiredFieldsByFieldValueInSection(
    section: FormSectionState,
    fieldValue: FormFieldState["value"],
    rule: FormRule
): FormSectionState {
    if (rule.type !== "requiredFieldsByFieldValue") return section;

    if (rule.sectionIdsWithRequiredFields.includes(section.id)) {
        const fieldsInSection: FormFieldState[] = section.fields.map(field => {
            return rule.requiredFieldIds.includes(field.id)
                ? {
                      ...field,
                      required: fieldValue === rule.fieldValue,
                      errors:
                          fieldValue !== rule.fieldValue
                              ? field.errors.filter(error => error !== ValidationErrorKey.FIELD_IS_REQUIRED)
                              : field.errors,
                  }
                : field;
        });

        return {
            ...section,
            fields: fieldsInSection,
        };
    } else {
        return {
            ...section,
        };
    }
}

import { ValidationError, ValidationErrorKey } from "../../../../domain/entities/amc-questionnaires/ValidationError";
import { Maybe } from "../../../../types/utils";
import { replaceById } from "../../../../utils/ts-utils";
import { FormFieldState, isFieldInSection, updateFields, validateField } from "./FormFieldsState";

import { FormRule } from "./FormRule";
import { FormState } from "./FormState";

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

export function setRequiredFieldsByFieldsConditionInSection(
    section: FormSectionState,
    formState: FormState,
    rule: FormRule
): FormSectionState {
    if (rule.type !== "requiredFieldsByCustomCondition") return section;

    const fieldValues = rule.fieldIds.reduce((acc: Record<string, FormFieldState["value"]>, fieldId) => {
        const fieldValue = getFieldValueByIdFromSections(formState.sections, fieldId);
        if (fieldValue === undefined) {
            console.warn(`setRequiredFieldsByFieldsConditionInSection: Field with id ${fieldId} not found in sections`);
            return acc;
        }
        return {
            ...acc,
            [fieldId]: fieldValue,
        };
    }, {});

    if (rule.sectionIdsWithRequiredFields.includes(section.id)) {
        const fieldsInSection: FormFieldState[] = section.fields.map(field => {
            return rule.requiredFieldIds.includes(field.id)
                ? {
                      ...field,
                      required: rule.condition(fieldValues),
                      errors: !rule.condition(fieldValues)
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

export function setDisabledOptionsByFieldValues(section: FormSectionState, rule: FormRule): FormSectionState {
    if (rule.type !== "disableOptionsByFieldValues") return section;
    const field = section.fields.find(field => field.id === rule.fieldId);
    if (!field) {
        return section; // No field with the specified ID in this section
    }
    if (!("options" in field)) {
        console.warn(`setDisabledOptionsByFieldValues: Field with id ${rule.fieldId} has no options`);
        return section;
    }
    const disabledOptions = rule.disableCondition(Array.isArray(field.value) ? field.value : [field.value]);
    const updatedField: FormFieldState = {
        ...field,
        options: field.options.map(option => ({
            ...option,
            disabled: disabledOptions.includes(option.value),
        })),
    };
    return {
        ...section,
        fields: replaceById(section.fields, updatedField),
    };
}

export function setOverrideFieldsByFieldValue(
    section: FormSectionState,
    formState: FormState,
    rule: FormRule
): FormSectionState {
    if (rule.type !== "overrideFieldsOnChange") return section;

    const fieldValue = getFieldValueByIdFromSections(formState.sections, rule.fieldId);
    if (fieldValue === undefined) {
        console.warn(`setOverrideFieldsByFieldValue: Field with id ${rule.fieldId} not found in sections`);
        return section;
    }
    if (fieldValue !== rule.fieldValue) {
        return section; // No override if value is not matching to target
    }
    const overrideFields = rule.overrideFieldsCallback(formState);

    const fieldsInSection: FormFieldState[] = section.fields.map(field => {
        const overrideField = overrideFields.find(override => override.id === field.id);
        return overrideField ? ({ ...field, ...overrideField } as FormFieldState) : field;
    });

    return {
        ...section,
        fields: fieldsInSection,
    };
}

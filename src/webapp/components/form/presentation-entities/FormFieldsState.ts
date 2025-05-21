import { validateFieldRequired } from "../validations";
import { FormSectionState } from "./FormSectionsState";
import { ValidationError, ValidationErrorKey } from "../../../../domain/entities/amc-questionnaires/ValidationError";
import { FormOption } from "./FormOption";

export type FieldType = "text" | "boolean" | "select" | "radio" | "checkboxes";

type FormFieldStateBase<T> = {
    id: string;
    label?: string;
    text?: string;
    placeholder?: string;
    helperText?: string;
    errors: string[];
    required?: boolean;
    showIsRequired?: boolean;
    disabled?: boolean;
    isVisible?: boolean;
    value: T;
    type: FieldType;
    updateAllStateWithValidationErrors?: boolean;
};

export type FormTextFieldState = FormFieldStateBase<string> & {
    type: "text";
    multiline?: boolean;
};

export type FormBooleanFieldState = FormFieldStateBase<boolean> & {
    type: "boolean";
};

export type FormMultipleOptionsFieldState = FormFieldStateBase<string[]> & {
    type: "select" | "checkboxes";
    options: FormOption[];
    multiple: true;
};

export type FormOptionsFieldState = FormFieldStateBase<string> & {
    type: "select" | "radio";
    options: FormOption[];
    multiple: false;
};

export type FormFieldState =
    | FormTextFieldState
    | FormOptionsFieldState
    | FormMultipleOptionsFieldState
    | FormBooleanFieldState;

// HELPERS:

export function getAllFieldsFromSections(formSections: FormSectionState[]): FormFieldState[] {
    return formSections.reduce((acc: FormFieldState[], section: FormSectionState): FormFieldState[] => {
        return [...acc, ...section.fields];
    }, []);
}

export function getStringFieldValue(id: string, allFields: FormFieldState[]): string {
    return getFieldValueById<FormTextFieldState | FormOptionsFieldState>(id, allFields) || "";
}

export function getBooleanFieldValue(id: string, allFields: FormFieldState[]): boolean {
    return !!getFieldValueById<FormBooleanFieldState>(id, allFields);
}

export function getMultipleOptionsFieldValue(id: string, allFields: FormFieldState[]): string[] {
    return getFieldValueById<FormMultipleOptionsFieldState>(id, allFields) || [];
}

export function getFieldValueById<F extends FormFieldState>(
    id: string,
    fields: FormFieldState[]
): F["value"] | undefined {
    return fields.find(field => field.id === id)?.value;
}

export function getFieldIdFromIdsDictionary<T extends Record<string, string>>(
    key: keyof T,
    fieldIdsDictionary: T
): string {
    return fieldIdsDictionary[key] as string;
}

export function getFieldWithEmptyValue(field: FormFieldState): FormFieldState {
    switch (field.type) {
        case "text":
            return { ...field, value: "" };
        case "boolean":
            return { ...field, value: false };
        case "select":
            if (field.multiple) {
                return { ...field, value: [] };
            } else {
                return { ...field, value: "" };
            }
        case "radio":
            return { ...field, value: "" };
        case "checkboxes":
            return { ...field, value: [] };
    }
}

export function isFieldInSection(section: FormSectionState, field: FormFieldState): boolean {
    return section.fields.some(f => f.id === field.id);
}

// UPDATES:

export function updateFields(
    formFields: FormFieldState[],
    updatedField: FormFieldState,
    fieldValidationErrors?: ValidationError[]
): FormFieldState[] {
    return formFields.map(field => {
        const validationError = fieldValidationErrors?.find(error => error.property === field.id);
        const errors = validationError?.errors || [];
        if (field.id === updatedField.id) {
            return {
                ...updatedField,
                errors: [...errors],
            };
        } else {
            return updatedField.updateAllStateWithValidationErrors
                ? {
                      ...field,
                      errors: [...errors],
                  }
                : field;
        }
    });
}

export function updateFieldState<F extends FormFieldState>(fieldToUpdate: F, newValue: F["value"]): F {
    return { ...fieldToUpdate, value: newValue };
}

// VALIDATIONS:

export function validateField(field: FormFieldState): ValidationError | undefined {
    if (!field.isVisible) return;

    const errors: ValidationErrorKey[] = [...(field.required ? validateFieldRequired(field.value, field.type) : [])];

    return errors.length > 0
        ? {
              property: field.id,
              errors: errors,
              value: field.value,
          }
        : undefined;
}

// RULES:

export function hideFieldsAndSetToEmpty(fields: FormFieldState[]): FormFieldState[] {
    return fields.map(field => ({
        ...getFieldWithEmptyValue(field),
        isVisible: false,
        errors: [],
    }));
}

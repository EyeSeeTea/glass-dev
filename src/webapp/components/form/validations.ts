import { ValidationErrorKey } from "../../../domain/entities/amc-questionnaires/ValidationError";
import { FieldType, FormFieldState } from "./presentation-entities/FormFieldsState";

export function validateFieldRequired(value: FormFieldState["value"], fieldType: FieldType): ValidationErrorKey[] {
    if ((fieldType === "select" || fieldType === "checkboxes") && Array.isArray(value)) {
        return value.length === 0 ? [ValidationErrorKey.FIELD_IS_REQUIRED] : [];
    } else if (fieldType === "boolean") {
        return value === undefined ? [ValidationErrorKey.FIELD_IS_REQUIRED] : [];
    } else {
        return !value || value === "" ? [ValidationErrorKey.FIELD_IS_REQUIRED] : [];
    }
}

import { Maybe } from "../../../utils/ts-utils";

export enum ValidationErrorKey {
    FIELD_IS_REQUIRED = "field_is_required",
    CANNOT_CREATE_AM_CLASS_QUESTIONNAIRE_NOT_CHECKED = "cannot_create_am_class_questionnaire_not_checked",
    CANNOT_CREATE_DUPLICATE_AM_CLASS_QUESTIONNAIRE = "cannot_create_duplicate_am_class_questionnaire",
}

export type ValidationError = {
    property: string;
    value: string | boolean | Date | Maybe<string> | string[] | null | Maybe<File>;
    errors: ValidationErrorKey[];
};

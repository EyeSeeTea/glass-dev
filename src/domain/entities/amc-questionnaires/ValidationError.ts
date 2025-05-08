import { Maybe } from "../../../utils/ts-utils";

export enum ValidationErrorKey {
    FIELD_IS_REQUIRED = "field_is_required",
    CANNOT_CREATE_DUPLICATE_AM_CLASS_QUESTIONNAIRE = "cannot_create_duplicate_am_class_questionnaire",
}

export type ValidationError = {
    property: string;
    value: string | boolean | Date | Maybe<string> | string[] | null | Maybe<File>;
    errors: ValidationErrorKey[];
};

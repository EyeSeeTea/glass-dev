import { Maybe } from "../../../utils/ts-utils";

export enum ValidationErrorKey {
    FIELD_IS_REQUIRED = "field_is_required",
}

export type ValidationError = {
    property: string;
    value: string | boolean | Date | Maybe<string> | string[] | null | Maybe<File>;
    errors: ValidationErrorKey[];
};

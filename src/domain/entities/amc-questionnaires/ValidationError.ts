import { Maybe } from "../../../utils/ts-utils";
import i18n from "../../../locales";

export enum ValidationErrorKey {
    FIELD_IS_REQUIRED = "field_is_required",
    CANNOT_CREATE_AM_CLASS_QUESTIONNAIRE_NOT_CHECKED = "cannot_create_am_class_questionnaire_not_checked",
    CANNOT_CREATE_DUPLICATE_AM_CLASS_QUESTIONNAIRE = "cannot_create_duplicate_am_class_questionnaire",
    COMPONENT_AM_WITHOUT_AMCLASS_QUESTIONNAIRE = "component_antimicrobial_without_amclass_questionnaire",
    COMPONENT_MUST_HAVE_AT_LEAST_ONE_STRATA = "component_must_have_at_least_one_strata",
    COMPONENT_STRATA_OVERLAP = "component_strata_must_not_overlap",
    INVALID_STRATA_VALUES = "invalid_strata_values",
}

export type ValidationError = {
    property: string;
    value: string | boolean | Date | Maybe<string> | string[] | null | Maybe<File>;
    errors: ValidationErrorKey[];
};

export function getValidationMessage(error: ValidationError): string {
    const errorKey = error.errors[0]; // TODO: handle multiple errors
    const defaultMessage = i18n.t("An unknown validation error occurred");
    if (!errorKey) {
        return defaultMessage;
    }
    switch (error.errors[0]) {
        case ValidationErrorKey.FIELD_IS_REQUIRED:
            return i18n.t("The field {{property}} is required", { property: error.property });
        case ValidationErrorKey.CANNOT_CREATE_AM_CLASS_QUESTIONNAIRE_NOT_CHECKED:
            return i18n.t(
                "Cannot create AM Class Questionnaire because the antimicrobial class is not checked in the General Questionnaire"
            );
        case ValidationErrorKey.CANNOT_CREATE_DUPLICATE_AM_CLASS_QUESTIONNAIRE:
            return i18n.t("AM class questionnaire already exists for this antimicrobial class");
        case ValidationErrorKey.COMPONENT_AM_WITHOUT_AMCLASS_QUESTIONNAIRE:
            return i18n.t("Component questionnaire cannot include an antimicrobial without an AM Class Questionnaire");
        case ValidationErrorKey.COMPONENT_MUST_HAVE_AT_LEAST_ONE_STRATA:
            return i18n.t("Component questionnaire must have at least one stratum selected");
        case ValidationErrorKey.COMPONENT_STRATA_OVERLAP:
            return i18n.t("Component questionnaire stratum must not overlap with other components stratum");
        case ValidationErrorKey.INVALID_STRATA_VALUES:
            return i18n.t("Invalid strata values selected. TOT / GLOB values must not overlap");
        default:
            return defaultMessage;
    }
}

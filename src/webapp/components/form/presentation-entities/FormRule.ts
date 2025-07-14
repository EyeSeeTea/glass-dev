import { Maybe } from "../../../../utils/ts-utils";
import { FormFieldState } from "./FormFieldsState";
import { FormState } from "./FormState";

type FieldValue = string | boolean | string[] | Date | Maybe<string> | null;

type RequiredyFieldByFieldValue = {
    type: "requiredFieldsByFieldValue";
    fieldId: string;
    fieldValue: FieldValue;
    requiredFieldIds: string[];
    sectionIdsWithRequiredFields: string[];
};

type RequiredFieldByCustomCondition = {
    type: "requiredFieldsByCustomCondition";
    fieldIds: string[];
    condition: (fields: Record<string, FieldValue>) => boolean;
    requiredFieldIds: string[];
    sectionIdsWithRequiredFields: string[];
};

// useful for disabling mutually exclusive options in a select field
type DisableOptionsByFieldValues = {
    type: "disableOptionsByFieldValues";
    fieldId: string;
    // return option values to disable
    disableCondition: (selectedValues: string[]) => string[];
};

type ToggleVisibilityByFieldValue = {
    type: "toggleVisibilityByFieldValue";
    fieldId: string;
    /** If true, the field will be visible */
    showCondition: (fieldValue: FieldValue) => boolean;
    fieldIdsToToggle: string[];
};

export type OverrideFieldsCallback<ContextType extends object> = (
    formState: FormState,
    context?: ContextType
) => (Pick<FormFieldState, "id"> & Partial<FormFieldState>)[];

// flexible rule to override multiple fields based on a field value change
export type OverrideFieldsByFieldValue<ContextType extends object> = {
    type: "overrideFieldsOnChange";
    fieldId: string;
    fieldValue?: FieldValue;
    overrideFieldsCallback: OverrideFieldsCallback<ContextType>;
    triggerOnLoad: boolean;
};

export type FormRule<ContextType extends object = object> =
    | RequiredyFieldByFieldValue
    | RequiredFieldByCustomCondition
    | DisableOptionsByFieldValues
    | OverrideFieldsByFieldValue<ContextType>
    | ToggleVisibilityByFieldValue;

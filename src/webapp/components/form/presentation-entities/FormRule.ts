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

// flexible rule to override multiple fields based on a field value change
export type OverrideFieldsByFieldValue = {
    type: "overrideFieldsOnChange";
    fieldId: string;
    fieldValue: FieldValue;
    overrideFieldsCallback: (formState: FormState) => (Pick<FormFieldState, "id"> & Partial<FormFieldState>)[];
    triggerOnLoad: boolean;
};

export type FormRule =
    | RequiredyFieldByFieldValue
    | RequiredFieldByCustomCondition
    | DisableOptionsByFieldValues
    | OverrideFieldsByFieldValue;

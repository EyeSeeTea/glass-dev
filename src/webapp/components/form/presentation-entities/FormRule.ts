import { Maybe } from "../../../../utils/ts-utils";

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

export type FormRule = RequiredyFieldByFieldValue | RequiredFieldByCustomCondition | DisableOptionsByFieldValues;

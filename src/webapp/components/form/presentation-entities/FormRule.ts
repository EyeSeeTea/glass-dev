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

export type FormRule = RequiredyFieldByFieldValue | RequiredFieldByCustomCondition;

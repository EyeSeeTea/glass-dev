import { Maybe } from "../../../../utils/ts-utils";

type RequiredyFieldByFieldValue = {
    type: "requiredFieldsByFieldValue";
    fieldId: string;
    fieldValue: string | boolean | string[] | Date | Maybe<string> | null;
    requiredFieldIds: string[];
    sectionIdsWithRequiredFields: string[];
};

export type FormRule = RequiredyFieldByFieldValue;

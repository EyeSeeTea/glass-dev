import { Id, NamedRef } from "./Ref";

export const dataFormTypes = ["dataSets", "programs", "trackerPrograms"] as const;
export type DataFormType = typeof dataFormTypes[number];
export type DataFormPeriod = "Daily" | "Monthly" | "Yearly" | "Weekly";

export interface DataForm {
    type: DataFormType;
    id: Id;
    name: string;
    periodType?: DataFormPeriod;
    dataElements: DataElement[];
    sections: {
        id: Id;
        name: string;
        dataElements: DataElement[];
        repeatable: boolean;
    }[];
    attributeValues: {
        attribute: { code: string };
        value: string;
    }[]; // Only used for versioning, is really being used by any client?
    teiAttributes?: TrackedEntityAttributeType[];
    trackedEntityType?: TrackedEntityType;
    readAccess: boolean;
    writeAccess: boolean;
}
export interface TrackedEntityAttributeType extends NamedRef {
    valueType: DataElementType | undefined;
}

export interface TrackedEntityType {
    id: Id;
    featureType: TrackedEntityTypeFeatureType;
}

export type TrackedEntityTypeFeatureType = "none" | "point" | "polygon";

export interface DataElement {
    id: Id;
    name: string;
    valueType: DataElementType;
    categoryOptionCombos?: Array<{ id: Id; name: string }>;
    options: Array<{ id: Id; code: string }>;
}

export type DataElementType =
    | "TEXT"
    | "LONG_TEXT"
    | "LETTER"
    | "PHONE_NUMBER"
    | "EMAIL"
    | "BOOLEAN"
    | "TRUE_ONLY"
    | "DATE"
    | "DATETIME"
    | "TIME"
    | "NUMBER"
    | "UNIT_INTERVAL"
    | "PERCENTAGE"
    | "INTEGER"
    | "INTEGER_POSITIVE"
    | "INTEGER_NEGATIVE"
    | "INTEGER_ZERO_OR_POSITIVE"
    | "TRACKER_ASSOCIATE"
    | "USERNAME"
    | "COORDINATE"
    | "ORGANISATION_UNIT"
    | "AGE"
    | "URL"
    | "FILE_RESOURCE"
    | "IMAGE";

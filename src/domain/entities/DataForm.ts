import { DataElementType } from "../../data/repositories/bulk-load/EGASPProgramDefaultRepository";
import { Id, NamedRef } from "./Ref";

export type DataFormPeriod = "Daily" | "Monthly" | "Yearly" | "Weekly";

export interface DataForm {
    type: "programs";
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
    teiAttributes?: NamedRef[];
    trackedEntityType?: TrackedEntityType;
    readAccess: boolean;
    writeAccess: boolean;
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

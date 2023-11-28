import { DataFormType } from "../DataForm";
import { Id } from "../Ref";
import { TrackedEntityInstance } from "../TrackedEntityInstance";

export type DataPackage = GenericProgramPackage | TrackerProgramPackage;

export interface BaseDataPackage {
    type: DataFormType;
    dataEntries: DataPackageData[];
}

export interface GenericProgramPackage extends BaseDataPackage {
    type: "dataSets" | "programs";
}

export interface TrackerProgramPackage extends BaseDataPackage {
    type: "trackerPrograms";
    trackedEntityInstances: TrackedEntityInstance[];
}

export interface DataPackageData {
    group?: number | string;
    id?: Id;
    dataForm: Id;
    orgUnit: Id;
    period: string;
    attribute?: Id;
    trackedEntityInstance?: Id;
    programStage?: Id;
    coordinate?: {
        latitude: number;
        longitude: number;
    };
    dataValues: DataPackageDataValue[];
}
export type DataPackageValue = string | number | boolean;
export interface DataPackageDataValue {
    dataElement: Id;
    category?: Id;
    value: DataPackageValue;
    optionId?: Id;
    comment?: string;
}

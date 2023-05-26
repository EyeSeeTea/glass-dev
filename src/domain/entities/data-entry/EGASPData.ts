import { Id } from "../Ref";

export interface EGASPData {} //TO DO: EGASP Data format

export interface DataPackage {
    type: "programs";
    dataEntries: DataPackageData[];
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

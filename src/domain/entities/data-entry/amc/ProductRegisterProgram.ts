import { Id } from "../../Ref";

export type ProgramStageDataElement = {
    id: Id;
    code: string;
    valueType: string;
    optionSetValue: boolean;
    optionSet: { options: { name: string; code: string }[] };
};

export type ProgramStage = {
    id: Id;
    name: string;
    dataElements: ProgramStageDataElement[];
};

export type ProgramTrackedEntityAttribute = {
    id: Id;
    code: string;
    valueType: string;
    optionSetValue: boolean;
    optionSet: { options: { name: string; code: string }[] };
};

export type ProductRegisterProgramMetadata = {
    programStages: ProgramStage[];
    programAttributes: ProgramTrackedEntityAttribute[];
};

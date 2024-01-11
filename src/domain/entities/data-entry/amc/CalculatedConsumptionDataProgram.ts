import { Id } from "../../Ref";

type DataElement = {
    id: Id;
    code: string;
    valueType: string;
    optionSetValue: boolean;
    optionSet: { options: { name: string; code: string }[] };
};

type CalculatedConsumptionDataProgramStage = {
    id: Id;
    name: string;
    dataElements: DataElement[];
};

export type CalculatedConsumptionDataProgram = {
    programStages: CalculatedConsumptionDataProgramStage[];
};

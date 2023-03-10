import { RISData } from "./RISData";
import { SampleData } from "./SampleData";

export interface ExternalData {
    COUNTRY: string;
    YEAR: number;
    SPECIMEN: string;
    GENDER: string;
    ORIGIN: string;
    AGEGROUP: string;
    BATCHIDDS: string;
}

export function isRISData(data: ExternalData): data is RISData {
    return (data as RISData).RESISTANT !== undefined;
}

export function isSampleData(data: ExternalData): data is SampleData {
    return (data as SampleData).NUMSAMPLEDPATIENTS !== undefined;
}

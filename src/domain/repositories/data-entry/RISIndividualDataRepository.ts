import { FutureData } from "../../entities/Future";
import { RISIndividualData } from "../../entities/data-entry/amr-i-external/RISIndividualData";

export interface RISIndividualDataRepository {
    get(file: File): FutureData<RISIndividualData[]>;
    validate(file: File): FutureData<{ isValid: boolean; records: number; specimens: string[] }>;
}

import { RISData } from "../../entities/data-entry/external/RISData";
import { FutureData } from "../../entities/Future";

export interface RISDataRepository {
    get(file: File): FutureData<RISData[]>;
    validate(file: File): FutureData<{ isValid: boolean; records: number; specimens: string[] }>;
}

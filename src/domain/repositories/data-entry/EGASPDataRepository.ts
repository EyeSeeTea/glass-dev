import { EGASPData } from "../../entities/data-entry/EGASPData";
import { FutureData } from "../../entities/Future";

export interface EGASPDataRepository {
    get(file: File): FutureData<EGASPData[]>;
    validate(file: File): FutureData<{ isValid: boolean; records: number; specimens: string[] }>;
}

import { FutureData } from "../../entities/Future";

export interface EGASPDataRepository {
    validate(file: File, dataColumns: string[]): FutureData<{ isValid: boolean; records: number; specimens: string[] }>;
}

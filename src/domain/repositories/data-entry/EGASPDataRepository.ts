import { FutureData } from "../../entities/Future";

export interface EGASPDataRepository {
    validate(file: File, dataColumns: string[]): FutureData<{ isValid: boolean; rows: number; specimens: string[] }>;
    encrypt(file: File, rowCount: number): FutureData<File>;
}

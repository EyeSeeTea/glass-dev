import { FutureData } from "../../entities/Future";

export interface EGASPDataRepository {
    validate(file: File): FutureData<{ isValid: boolean; records: number; specimens: string[] }>;
}

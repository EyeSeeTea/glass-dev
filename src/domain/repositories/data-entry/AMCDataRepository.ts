import { FutureData } from "../../entities/Future";

export interface AMCDataRepository {
    validate(
        file: File,
        teiDataColumns: string[],
        rawProductDataColumns: string[]
    ): FutureData<{ isValid: boolean; records: number; specimens: string[] }>;
}

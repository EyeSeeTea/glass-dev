import { ValidationResultWithSpecimens } from "../../entities/FileValidationResult";
import { FutureData } from "../../entities/Future";

export interface AMCDataRepository {
    validate(
        file: File,
        teiDataColumns: string[],
        rawProductDataColumns: string[]
    ): FutureData<ValidationResultWithSpecimens>;
}

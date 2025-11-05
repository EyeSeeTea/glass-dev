import { ValidationResultWithSpecimens } from "../../entities/FileValidationResult";
import { FutureData } from "../../entities/Future";

export interface EGASPDataRepository {
    validate(file: File, dataColumns: string[]): FutureData<ValidationResultWithSpecimens>;
}

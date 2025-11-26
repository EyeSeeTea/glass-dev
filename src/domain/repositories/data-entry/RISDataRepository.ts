import { RISData } from "../../entities/data-entry/amr-external/RISData";
import { ValidationResultWithSpecimens } from "../../entities/FileValidationResult";
import { FutureData } from "../../entities/Future";

export interface RISDataRepository {
    get(file: File): FutureData<RISData[]>;
    validate(file: File): FutureData<ValidationResultWithSpecimens>;
    getFromArrayBuffer(arrayBuffer: ArrayBuffer): FutureData<RISData[]>;
}

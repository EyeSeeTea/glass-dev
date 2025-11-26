import { SampleData } from "../../entities/data-entry/amr-external/SampleData";
import { ValidationResult } from "../../entities/FileValidationResult";
import { FutureData } from "../../entities/Future";

export interface SampleDataRepository {
    get(file: File): FutureData<SampleData[]>;
    validate(file: File): FutureData<ValidationResult>;
    getFromArrayBuffer(arrayBuffer: ArrayBuffer): FutureData<SampleData[]>;
    getFromBlob(blob: Blob): FutureData<SampleData[]>;
}

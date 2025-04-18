import { SampleData } from "../../entities/data-entry/amr-external/SampleData";
import { FutureData } from "../../entities/Future";

export interface SampleDataRepository {
    get(file: File): FutureData<SampleData[]>;
    validate(file: File): FutureData<{ isValid: boolean; rows: number }>;
    getFromArayBuffer(arrayBuffer: ArrayBuffer): FutureData<SampleData[]>;
    getFromBlob(blob: Blob): FutureData<SampleData[]>;
}

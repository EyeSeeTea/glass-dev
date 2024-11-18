import { RISData } from "../../entities/data-entry/amr-external/RISData";
import { FutureData } from "../../entities/Future";

export interface RISDataRepository {
    get(file: File): FutureData<RISData[]>;
    validate(file: File): FutureData<{ isValid: boolean; specimens: string[]; rows: number }>;
    getFromArayBuffer(arrayBuffer: ArrayBuffer): FutureData<RISData[]>;
}

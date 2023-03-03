import { RISData } from "../../entities/data-entry/external/RISData";
import { FutureData } from "../../entities/Future";

export interface RISDataRepository {
    get(file: File): FutureData<RISData[]>;
}
import { SampleData } from "../../entities/data-entry/external/SampleData";
import { FutureData } from "../../entities/Future";

export interface SampleDataRepository {
    get(file: File): FutureData<SampleData[]>;
    validate(file: File): FutureData<boolean>;
}

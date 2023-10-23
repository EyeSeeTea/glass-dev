import { FutureData } from "../../entities/Future";
import { RISIndividualFunghiData } from "../../entities/data-entry/amr-individual-funghi-external/RISIndividualFunghiData";

export interface RISIndividualFunghiDataRepository {
    get(file: File): FutureData<RISIndividualFunghiData[]>;
    validate(file: File): FutureData<{ isValid: boolean; records: number; specimens: string[] }>;
}

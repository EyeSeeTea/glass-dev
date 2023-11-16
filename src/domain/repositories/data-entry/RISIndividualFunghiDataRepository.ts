import { FutureData } from "../../entities/Future";
import { RISIndividualFunghiData } from "../../entities/data-entry/amr-individual-funghi-external/RISIndividualFunghiData";

export interface RISIndividualFunghiDataRepository {
    get(moduleName: string, file: File): FutureData<RISIndividualFunghiData[]>;
    validate(moduleName: string, file: File): FutureData<{ isValid: boolean; specimens: string[]; rows: number }>;
}

import { CustomDataColumns } from "../../entities/data-entry/amr-individual-funghi-external/RISIndividualFunghiData";
import { FutureData } from "../../entities/Future";

export interface RISIndividualFunghiDataRepository {
    get(moduleName: string, file: File): FutureData<CustomDataColumns[]>;
    validate(moduleName: string, file: File): FutureData<{ isValid: boolean; specimens: string[]; rows: number }>;
}

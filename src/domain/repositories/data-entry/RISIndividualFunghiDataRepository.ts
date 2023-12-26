import { CustomDataColumns } from "../../entities/data-entry/amr-individual-funghi-external/RISIndividualFunghiData";
import { FutureData } from "../../entities/Future";

export interface RISIndividualFunghiDataRepository {
    get(dataColumns: CustomDataColumns, file: File): FutureData<CustomDataColumns[]>;
    validate(
        dataColumns: CustomDataColumns,
        file: File
    ): FutureData<{ isValid: boolean; specimens: string[]; rows: number }>;
}

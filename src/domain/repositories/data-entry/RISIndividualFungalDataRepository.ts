import { CustomDataColumns } from "../../entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";
import { FutureData } from "../../entities/Future";

export interface RISIndividualFungalDataRepository {
    get(dataColumns: CustomDataColumns, file: File): FutureData<CustomDataColumns[]>;
    validate(
        dataColumns: CustomDataColumns,
        file: File
    ): FutureData<{ isValid: boolean; specimens: string[]; rows: number }>;
}

import { CustomDataColumns } from "../../entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";
import { ValidationResultWithSpecimens } from "../../entities/FileValidationResult";
import { FutureData } from "../../entities/Future";

export interface RISIndividualFungalDataRepository {
    get(dataColumns: CustomDataColumns, file: File): FutureData<CustomDataColumns[]>;
    getFromBlob(dataColumns: CustomDataColumns, blob: Blob): FutureData<CustomDataColumns[]>;
    validate(dataColumns: CustomDataColumns, file: File | Blob): FutureData<ValidationResultWithSpecimens>;
}

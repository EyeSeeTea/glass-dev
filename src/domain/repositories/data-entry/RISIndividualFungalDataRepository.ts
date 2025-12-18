import { CustomDataColumns } from "../../entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";
import { FutureData } from "../../entities/Future";

export interface RISIndividualFungalDataRepository {
    get(dataColumns: CustomDataColumns, file: File): FutureData<CustomDataColumns[]>;
    getFromBlob(dataColumns: CustomDataColumns, blob: Blob): FutureData<CustomDataColumns[]>;
    validate(
        dataColumns: CustomDataColumns,
        file: File | Blob
    ): FutureData<{ isValid: boolean; specimens: string[]; rows: number }>;
    getFromBlobInChunks(
        dataColumns: CustomDataColumns,
        blob: Blob,
        chunkSize: number,
        onChunk: (chunk: CustomDataColumns[]) => FutureData<boolean>
    ): FutureData<void>;
}

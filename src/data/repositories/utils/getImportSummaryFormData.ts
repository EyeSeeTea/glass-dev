import FormData from "form-data";
import { ImportSummary, ImportSummaryErrors } from "../../../domain/entities/data-entry/ImportSummary";

export function getAsyncImportSummariesFormData(importSummaries: ImportSummary[]): FormData {
    const fileBlob = new Blob([JSON.stringify(importSummaries)], {
        type: "text/plain",
    });

    return createFormData(fileBlob, "asyncImportSummaries.txt");
}

export function getImportSummaryFormData(importSummary: ImportSummaryErrors): FormData {
    const fileBlob = new Blob([JSON.stringify(importSummary)], {
        type: "text/plain",
    });

    return createFormData(fileBlob, "importSummary.txt");
}

function createFormData(fileBlob: Blob, fileName: string): FormData {
    const formData = new FormData();
    formData.append("file", fileBlob, fileName);
    formData.append("domain", "DATA_VALUE");

    return formData;
}

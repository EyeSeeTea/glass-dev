import { ImportSummary, ImportSummaryErrors } from "../../../../domain/entities/data-entry/ImportSummary";
import { UploadsFormDataBuilder } from "./UploadsFormDataBuilder";

export class BrowserUploadsFormDataBuilder implements UploadsFormDataBuilder {
    createAsyncImportSummariesFormData(importSummaries: ImportSummary[]): FormData {
        const fileBlob = new Blob([JSON.stringify(importSummaries)], { type: "text/plain" });

        return this.createFormData(fileBlob, "asyncImportSummaries.txt");
    }

    createImportSummaryFormData(importSummary: ImportSummaryErrors): FormData {
        const fileBlob = new Blob([JSON.stringify(importSummary)], { type: "text/plain" });

        return this.createFormData(fileBlob, "importSummary.txt");
    }

    private createFormData(fileBlob: Blob, fileName: string): FormData {
        const formData = new FormData();
        formData.append("file", fileBlob, fileName);
        formData.append("domain", "DATA_VALUE");

        return formData;
    }
}

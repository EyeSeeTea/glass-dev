import FormDataNode from "form-data";
import { UploadsFormDataBuilder } from "./UploadsFormDataBuilder";
import { ImportSummary, ImportSummaryErrors } from "../../../../domain/entities/data-entry/ImportSummary";

export class NodeUploadsFormDataBuilder implements UploadsFormDataBuilder {
    createAsyncImportSummariesFormData(importSummaries: ImportSummary[]) {
        return this.createNodeFormData(importSummaries, "asyncImportSummaries.txt");
    }

    createImportSummaryFormData(importSummary: ImportSummaryErrors) {
        return this.createNodeFormData(importSummary, "importSummary.txt");
    }

    private createNodeFormData(json: unknown, fileName: string): InstanceType<typeof FormDataNode> {
        const jsonString = JSON.stringify(json);
        const buffer = Buffer.from(jsonString);

        const formData = new FormDataNode();
        formData.append("file", buffer, {
            filename: fileName,
            contentType: "text/plain",
        });
        formData.append("domain", "DATA_VALUE");

        return formData;
    }
}

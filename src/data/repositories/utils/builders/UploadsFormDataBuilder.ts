import { ImportSummary, ImportSummaryErrors } from "../../../../domain/entities/data-entry/ImportSummary";
import { BrowserUploadsFormDataBuilder } from "./BrowserUploadsFormDataBuilder";
import { NodeUploadsFormDataBuilder } from "./NodeUploadsFormDataBuilder";

import type FormDataNode from "form-data";

export type UploadsFormData = FormData | FormDataNode;

export interface UploadsFormDataBuilder {
    createAsyncImportSummariesFormData(importSummaries: ImportSummary[]): UploadsFormData;
    createImportSummaryFormData(importSummary: ImportSummaryErrors): UploadsFormData;
}

export function getUploadsFormDataBuilder(runtime: "node" | "browser"): UploadsFormDataBuilder {
    switch (runtime) {
        case "node":
            return new NodeUploadsFormDataBuilder();
        case "browser":
            return new BrowserUploadsFormDataBuilder();
        default:
            console.error(`[UploadsFormDataBuilder] Runtime desconocido: ${runtime}`);
            throw new Error(`[UploadsFormDataBuilder] Runtime desconocido: ${runtime}`);
    }
}

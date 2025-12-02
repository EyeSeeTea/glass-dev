import type FormDataNode from "form-data";

import { ImportSummary, ImportSummaryErrors } from "../../../../domain/entities/data-entry/ImportSummary";

export type UploadsFormData = FormData | FormDataNode;

export interface UploadsFormDataBuilder {
    createAsyncImportSummariesFormData(importSummaries: ImportSummary[]): UploadsFormData;
    createImportSummaryFormData(importSummary: ImportSummaryErrors): UploadsFormData;
}

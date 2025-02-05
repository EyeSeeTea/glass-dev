import { ImportSummaryErrors } from "../../domain/entities/data-entry/ImportSummary";

export interface UploadsDataItem {
    id: string;
    batchId: string;
    countryCode: string;
    fileType: string;
    fileId: string;
    fileName: string;
    inputLineNb: number;
    outputLineNb: number;
    period: string;
    specimens: string[];
    status: string;
    uploadDate: string;
    dataSubmission: string;
    module: string;
    orgUnit: string;
    records?: number; // TODO: Delete when no items in DataStore with records (because becomes rows)
    rows?: number;
    correspondingRisUploadId: string;
    eventListFileId?: string;
    calculatedEventListFileId?: string;
    importSummary?: ImportSummaryErrors;
    eventListDataDeleted?: boolean;
    calculatedEventListDataDeleted?: boolean;
    errorAsyncDeleting?: boolean;
}

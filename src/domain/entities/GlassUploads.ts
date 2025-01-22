import { ImportSummaryErrors } from "./data-entry/ImportSummary";
import { Id } from "./Ref";

export interface GlassUploads {
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
    orgUnit: Id;
    records?: number;
    rows?: number;
    correspondingRisUploadId: string;
    eventListFileId?: string;
    calculatedEventListFileId?: string;
    importSummary?: ImportSummaryErrors;
    eventListDataDeleted?: boolean;
    calculatedEventListDataDeleted?: boolean;
    errorAsyncDeleting?: boolean;
}

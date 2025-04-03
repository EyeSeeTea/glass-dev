import { ImportSummary, ImportSummaryErrors } from "./data-entry/ImportSummary";
import { Id } from "./Ref";

export type GlassUploadsStatus = "UPLOADED" | "IMPORTED" | "VALIDATED" | "COMPLETED";

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
    status: GlassUploadsStatus;
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
    errorAsyncUploading?: boolean;
    asyncImportSummaries?: ImportSummary[];
}

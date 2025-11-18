import { ImportSummary, ImportSummaryErrors } from "./data-entry/ImportSummary";
import { Id } from "./Ref";

export type GlassUploadsStatus =
    | "PREPROCESSING"
    | "PREPROCESSING_FAILED"
    | "UPLOADED"
    | "IMPORTED"
    | "VALIDATED"
    | "COMPLETED";
interface GlassUploadsBase {
    id: string;
    batchId: string;
    countryCode: string;
    fileType: string;
    fileId: string;
    fileName: string;
    inputLineNb: number;
    outputLineNb: number;
    period: string;
    status: GlassUploadsStatus;
    specimens?: string[];
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
    errorAsyncPreprocessing?: boolean;
    errorMessageAsyncPreprocessing?: string;
    asyncImportSummaries?: ImportSummary[];
}

export type GlassUploads = GlassUploadsBase;

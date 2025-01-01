import { FutureData } from "../entities/Future";
import { GlassUploads } from "../entities/GlassUploads";
import { Id } from "../entities/Ref";
import { ImportSummaryErrors } from "../entities/data-entry/ImportSummary";

export interface GlassUploadsRepository {
    getAll(): FutureData<GlassUploads[]>;
    getById(uploadId: Id): FutureData<GlassUploads>;
    save(upload: GlassUploads): FutureData<void>;
    setStatus(id: string, status: string): FutureData<void>;
    setBatchId(id: string, batchId: string): FutureData<void>;
    delete(id: string): FutureData<{
        fileId: string;
        eventListFileId: string | undefined;
        calculatedEventListFileId: string | undefined;
    }>;
    getUploadsByModuleOU(module: string, orgUnit: string): FutureData<GlassUploads[]>;
    getUploadsByModuleOUPeriod(module: string, orgUnit: string, period: string): FutureData<GlassUploads[]>;
    updateSampleUploadWithRisId(sampleUploadId: string, risUploadId: string): FutureData<void>;
    setEventListFileId(id: string, eventListFileId: string): FutureData<void>;
    saveImportSummaryErrorsOfFilesInUploads(params: {
        primaryUploadId: Id;
        primaryImportSummaryErrors: ImportSummaryErrors;
        secondaryUploadId?: Id;
        secondaryImportSummaryErrors?: ImportSummaryErrors;
    }): FutureData<void>;
    getUploadsByDataSubmission(dataSubmissionId: Id): FutureData<GlassUploads[]>;
    getEventListFileIdByUploadId(id: string): FutureData<string>;
    setCalculatedEventListFileId(uploadId: string, calculatedEventListFileId: string): FutureData<void>;
    setAsyncDeletions(uploadIdsToDelete: Id[]): FutureData<Id[]>;
    getAsyncDeletions(): FutureData<Id[]>;
    removeAsyncDeletions(uploadIdToRemove: Id[]): FutureData<Id[]>;
    setEventListDataDeleted(id: string): FutureData<void>;
    setCalculatedEventListDataDeleted(id: string): FutureData<void>;
}

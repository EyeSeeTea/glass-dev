import { FutureData } from "../entities/Future";
import { GlassUploads, GlassUploadsStatus } from "../entities/GlassUploads";
import { Id } from "../entities/Ref";
import { ImportSummary, ImportSummaryErrors } from "../entities/data-entry/ImportSummary";

/* TODO: change setStatus, setBatchId, updateSampleUploadWithRisId, setEventListFileId, saveImportSummaryErrorsOfFilesInUploads,
 * setCalculatedEventListFileId, setEventListDataDeleted, setCalculatedEventListDataDeleted, setMultipleErrorAsyncDeleting,
 * setMultipleErrorAsyncUploading, saveImportSummaries functions to return and receive entities, not primitives, to avoid bussiness rules in repository
 */
export interface GlassUploadsRepository {
    getById(id: Id): FutureData<GlassUploads>;
    getByIds(ids: Id[], options?: { chunkSize: number }): FutureData<GlassUploads[]>;
    save(upload: GlassUploads): FutureData<void>;
    setStatus(id: Id, status: GlassUploadsStatus): FutureData<void>;
    setBatchId(id: string, batchId: string): FutureData<void>;
    delete(id: string): FutureData<{
        fileId: string;
        eventListFileId: string | undefined;
        calculatedEventListFileId: string | undefined;
    }>;
    getUploadsByModuleOU(module: string, orgUnit: string): FutureData<GlassUploads[]>;
    getUploadsByModuleOUPeriod(props: GetUploadsByModuleOuParams): FutureData<GlassUploads[]>;
    updateSampleUploadWithRisId(sampleUploadId: string, risUploadId: string): FutureData<void>;
    setEventListFileId(id: string, eventListFileId: string): FutureData<void>;
    saveImportSummaryErrorsOfFilesInUploads(params: {
        primaryUploadId: Id;
        primaryImportSummaryErrors: ImportSummaryErrors;
        secondaryUploadId?: Id;
        secondaryImportSummaryErrors?: ImportSummaryErrors;
    }): FutureData<void>;
    getUploadsByDataSubmission(dataSubmissionId: Id): FutureData<GlassUploads[]>;
    getByDataSubmissionIds(dataSubmissionIds: Id[]): FutureData<GlassUploads[]>;
    getByCorrespondingRisUploadId(correspondingRisUploadId: Id): FutureData<GlassUploads>;
    getEventListFileIdByUploadId(id: string): FutureData<string>;
    setCalculatedEventListFileId(uploadId: string, calculatedEventListFileId: string): FutureData<void>;
    setEventListDataDeleted(id: string): FutureData<void>;
    setCalculatedEventListDataDeleted(id: string): FutureData<void>;
    setMultipleErrorAsyncDeleting(ids: Id[]): FutureData<void>;
    setMultipleErrorAsyncUploading(ids: Id[]): FutureData<void>;
    saveImportSummaries(params: { uploadId: Id; importSummaries: ImportSummary[] }): FutureData<void>;
}

export type UploadFilters = {
    moduleIds: string[];
    fileTypes: string[];
};

export type GetUploadsByModuleOuParams = {
    moduleId: string;
    orgUnit: string;
    period: string;
    additionalFilters?: UploadFilters;
};

import { FutureData } from "../entities/Future";
import { GlassUploads } from "../entities/GlassUploads";

export interface GlassUploadsRepository {
    getAll(): FutureData<GlassUploads[]>;
    save(upload: GlassUploads): FutureData<void>;
    setStatus(id: string, status: string): FutureData<void>;
    setBatchId(id: string, batchId: string): FutureData<void>;
    delete(id: string): FutureData<{ fileId: string; eventListFileId: string | undefined }>;
    getUploadsByModuleOU(module: string, orgUnit: string): FutureData<GlassUploads[]>;
    getUploadsByModuleOUPeriod(module: string, orgUnit: string, period: string): FutureData<GlassUploads[]>;
    updateSampleUploadWithRisId(sampleUploadId: string, risUploadId: string): FutureData<void>;
    setEventListFileId(id: string, eventListFileId: string): FutureData<void>;
}

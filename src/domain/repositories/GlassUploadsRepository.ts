import { FutureData } from "../entities/Future";
import { GlassUploads } from "../entities/GlassUploads";

export interface GlassUploadsRepository {
    getAll(): FutureData<GlassUploads[]>;
    save(upload: GlassUploads): FutureData<void>;
    setStatus(id: string, status: string): FutureData<void>;
    setBatchId(id: string, batchId: string): FutureData<void>;
    resetFileInfo(id: string): FutureData<string>;
}

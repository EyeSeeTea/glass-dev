import { FutureData } from "../entities/Future";
import { GlassUploads } from "../entities/GlassUploads";

export interface GlassUploadsRepository {
    getAll(): FutureData<GlassUploads[]>;
    save(uploads: GlassUploads[]): FutureData<void>;
}

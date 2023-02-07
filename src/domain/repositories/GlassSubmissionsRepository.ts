import { FutureData } from "../entities/Future";
import { GlassSubmissions } from "../entities/GlassSubmissions";

export interface GlassSubmissionsRepository {
    getAll(): FutureData<GlassSubmissions[]>;
    save(submission: GlassSubmissions): FutureData<void>;
    setStatus(id: string, status: string): FutureData<void>;
}

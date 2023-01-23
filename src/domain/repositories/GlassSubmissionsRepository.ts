import { FutureData } from "../entities/Future";
import { GlassSubmissions } from "../entities/GlassSubmissions";

export interface GlassSubmissionsRepository {
    getAll(): FutureData<GlassSubmissions[]>;
    save(submissions: GlassSubmissions[]): FutureData<void>;
}

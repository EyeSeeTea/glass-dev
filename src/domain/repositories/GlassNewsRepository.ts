import { FutureData } from "../entities/Future";
import { GlassNews } from "../entities/GlassNews";

export interface GlassNewsRepository {
    getAll(): FutureData<GlassNews[]>;
    save(news: GlassNews[]): FutureData<void>;
}

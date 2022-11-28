import { FutureData } from "../entities/Future";
import { GlassModule } from "../entities/GlassModule";

export interface GlassModuleRepository {
    getAll(): FutureData<GlassModule[]>;
    getByName(name: string): FutureData<GlassModule>;
    save(modules: GlassModule[]): FutureData<void>;
}

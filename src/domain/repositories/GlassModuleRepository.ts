import { Id } from "@eyeseetea/d2-api";
import { FutureData } from "../entities/Future";
import { GlassModule } from "../entities/GlassModule";

export interface GlassModuleRepository {
    getAll(): FutureData<GlassModule[]>;
    getByName(name: string): FutureData<GlassModule>;
    save(modules: GlassModule[]): FutureData<void>;
    getById(id: Id): FutureData<GlassModule>;
}

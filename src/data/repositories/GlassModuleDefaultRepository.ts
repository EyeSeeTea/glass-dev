import { FutureData } from "../../domain/entities/Future";
import { GlassModule } from "../../domain/entities/GlassModule";
import { GlassModuleRepository } from "../../domain/repositories/GlassModuleRepository";
import { cache } from "../../utils/cache";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";

export class GlassModuleDefaultRepository implements GlassModuleRepository {
    constructor(private dataStoreClient: DataStoreClient) {}

    @cache()
    getAll(): FutureData<GlassModule[]> {
        return this.dataStoreClient.listCollection<GlassModule>(DataStoreKeys.MODULES);
    }

    @cache()
    getByName(name: string): FutureData<GlassModule> {
        return this.dataStoreClient.getObjectCollectionByProp<GlassModule>(DataStoreKeys.MODULES, "name", name);
    }

    save(modules: GlassModule[]): FutureData<void> {
        return this.dataStoreClient.saveObject(DataStoreKeys.MODULES, modules);
    }
}

import { FutureData } from "../../domain/entities/Future";
import { GlassNews } from "../../domain/entities/GlassNews";
import { GlassNewsRepository } from "../../domain/repositories/GlassNewsRepository";
import { cache } from "../../utils/cache";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";

export class GlassNewsDefaultRepository implements GlassNewsRepository {
    constructor(private dataStoreClient: DataStoreClient) {}

    @cache()
    getAll(): FutureData<GlassNews[]> {
        return this.dataStoreClient.listCollection<GlassNews>(DataStoreKeys.NEWS);
    }

    save(news: GlassNews[]): FutureData<void> {
        return this.dataStoreClient.saveObject(DataStoreKeys.NEWS, news);
    }
}

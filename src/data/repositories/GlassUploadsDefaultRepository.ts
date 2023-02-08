import { FutureData } from "../../domain/entities/Future";
import { GlassUploads } from "../../domain/entities/GlassUploads";
import { GlassUploadsRepository } from "../../domain/repositories/GlassUploadsRepository";
import { cache } from "../../utils/cache";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";

export class GlassUploadsDefaultRepository implements GlassUploadsRepository {
    constructor(private dataStoreClient: DataStoreClient) {}

    @cache()
    getAll(): FutureData<GlassUploads[]> {
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS);
    }

    save(upload: GlassUploads): FutureData<void> {
        return this.dataStoreClient.listCollection(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const newUploads = [...uploads, upload];
            return this.dataStoreClient.saveObject(DataStoreKeys.UPLOADS, newUploads);
        });
    }
}

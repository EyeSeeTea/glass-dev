import { FutureData } from "../../domain/entities/Future";
import { GlassDocuments } from "../../domain/entities/GlassDocuments";
import { GlassDocumentsRepository } from "../../domain/repositories/GlassDocumentsRepository";
import { cache } from "../../utils/cache";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";

export class GlassDocumentsDefaultRepository implements GlassDocumentsRepository {
    constructor(private dataStoreClient: DataStoreClient) {}

    @cache()
    getAll(): FutureData<GlassDocuments[]> {
        return this.dataStoreClient.listCollection<GlassDocuments>(DataStoreKeys.DOCUMENTS);
    }

    save(documents: GlassDocuments[]): FutureData<void> {
        return this.dataStoreClient.saveObject(DataStoreKeys.DOCUMENTS, documents);
    }
}

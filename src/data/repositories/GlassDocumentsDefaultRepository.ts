import { D2Api } from "@eyeseetea/d2-api/2.34";
import { Future, FutureData } from "../../domain/entities/Future";
import { GlassDocuments } from "../../domain/entities/GlassDocuments";
import { GlassDocumentsRepository } from "../../domain/repositories/GlassDocumentsRepository";
import { cache } from "../../utils/cache";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";
import { Instance } from "../entities/Instance";
import { apiToFuture } from "../../utils/futures";

export class GlassDocumentsDefaultRepository implements GlassDocumentsRepository {
    private api: D2Api;

    constructor(private dataStoreClient: DataStoreClient, instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    @cache()
    getAll(): FutureData<GlassDocuments[]> {
        return this.dataStoreClient.listCollection<GlassDocuments>(DataStoreKeys.DOCUMENTS);
    }

    save(file: File): FutureData<string> {
        return Future.join2(
            apiToFuture(
                this.api.files.upload({
                    name: file?.name as string,
                    data: file as Blob,
                })
            ),
            this.dataStoreClient.listCollection(DataStoreKeys.DOCUMENTS)
        ).flatMap(data => {
            const document = {
                id: data[0].id,
                fileResourceId: data[0].fileResourceId,
                createdAt: new Date().toISOString(),
            };

            const newDocuments = [...data[1], document];
            this.dataStoreClient.saveObject(DataStoreKeys.DOCUMENTS, newDocuments);
            return Future.success(document.id);
        });
    }
}

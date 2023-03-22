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
import { HttpResponse } from "@eyeseetea/d2-api/api/common";

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
            return this.dataStoreClient
                .saveObject(DataStoreKeys.DOCUMENTS, newDocuments)
                .flatMap(() => Future.success(document.id));
        });
    }

    delete(id: string): FutureData<string> {
        return this.dataStoreClient.listCollection<GlassDocuments>(DataStoreKeys.DOCUMENTS).flatMap(documents => {
            const document = documents.find(document => document.id === id);
            if (document) {
                documents.splice(documents.indexOf(document), 1);
                return this.dataStoreClient
                    .saveObject(DataStoreKeys.DOCUMENTS, documents)
                    .flatMap(() => Future.success(document.id));
            } else {
                return Future.error("Document could not be found");
            }
        });
    }

    download(id: string): FutureData<Blob> {
        return apiToFuture(this.api.files.get(id));
    }

    deleteDocumentApi(id: string): FutureData<void> {
        return apiToFuture(
            this.api.request<HttpResponse<Response>>({ url: `/documents/${id}`, method: "delete" })
        ).flatMap(response => {
            if (response.httpStatus === "OK") return Future.success(undefined);
            else return Future.error("Error when deleting document");
        });
    }
}

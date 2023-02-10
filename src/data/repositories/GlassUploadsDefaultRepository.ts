import { Future, FutureData } from "../../domain/entities/Future";
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

    setStatus(id: string, status: string): FutureData<void> {
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const upload = uploads?.find(upload => upload.id === id);
            if (upload) {
                upload.status = status;
                return this.dataStoreClient.saveObject(DataStoreKeys.UPLOADS, uploads);
            } else {
                return Future.error("Upload does not exist");
            }
        });
    }

    setBatchId(id: string, batchId: string): FutureData<void> {
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const upload = uploads.find(el => el.id === id);
            if (upload) {
                upload.batchId = batchId;
                return this.dataStoreClient.saveObject(DataStoreKeys.UPLOADS, uploads);
            } else {
                return Future.error("Upload not found");
            }
        });
    }

    resetFileInfo(id: string): FutureData<string> {
        return this.dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS).flatMap(uploads => {
            const upload = uploads?.find(upload => upload.id === id);
            if (upload) {
                const documentId = upload.fileId;
                upload.fileId = "";
                upload.fileName = "";
                upload.fileType = "";
                return this.dataStoreClient
                    .saveObject(DataStoreKeys.UPLOADS, uploads)
                    .flatMap(() => Future.success(documentId));
            } else {
                return Future.error("Upload does not exist");
            }
        });
    }
}

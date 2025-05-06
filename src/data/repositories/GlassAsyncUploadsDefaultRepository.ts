import { Future, FutureData } from "../../domain/entities/Future";
import {
    GlassAsyncUpload,
    GlassAsyncUploadStatus,
    INITIAL_ASYNC_UPLOAD_STATE,
} from "../../domain/entities/GlassAsyncUploads";
import { Id } from "../../domain/entities/Ref";
import { GlassAsyncUploadsRepository } from "../../domain/repositories/GlassAsyncUploadsRepository";
import { Maybe } from "../../utils/ts-utils";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";

export class GlassAsyncUploadsDefaultRepository implements GlassAsyncUploadsRepository {
    constructor(private dataStoreClient: DataStoreClient) {}

    getAsyncUploads(): FutureData<GlassAsyncUpload[]> {
        return this.dataStoreClient.listCollection<GlassAsyncUpload>(DataStoreKeys.ASYNC_UPLOADS);
    }

    getById(uploadId: Id): FutureData<GlassAsyncUpload | undefined> {
        return this.getAsyncUploads().map(asyncUploadsArray =>
            asyncUploadsArray.find(asyncUpload => asyncUpload.uploadId === uploadId)
        );
    }

    setStatus(uploadId: Id, newStatus: GlassAsyncUploadStatus): FutureData<void> {
        return this.getAsyncUploads().flatMap(asyncUploadsArray => {
            const newAsyncUploads: GlassAsyncUpload[] = asyncUploadsArray.map(asyncUpload => {
                return asyncUpload.uploadId === uploadId
                    ? {
                          ...asyncUpload,
                          status: newStatus,
                      }
                    : asyncUpload;
            });
            return this.dataStoreClient.saveObject(DataStoreKeys.ASYNC_UPLOADS, newAsyncUploads);
        });
    }

    setAsyncUploadById(primaryUploadId: Maybe<Id>, secondaryUploadId: Maybe<Id>): FutureData<void> {
        if (!primaryUploadId && !secondaryUploadId) {
            return Future.error("At least one of the primary or secondary upload id must be provided");
        }

        return this.getAsyncUploads().flatMap(asyncUploadsArray => {
            const newAsyncUploads: GlassAsyncUpload[] = [
                ...asyncUploadsArray,
                {
                    ...INITIAL_ASYNC_UPLOAD_STATE,
                    uploadId: primaryUploadId
                        ? primaryUploadId
                        : secondaryUploadId
                        ? secondaryUploadId
                        : INITIAL_ASYNC_UPLOAD_STATE.uploadId,
                    type: primaryUploadId ? "primary" : "secondary",
                },
            ];
            return this.dataStoreClient.saveObject(DataStoreKeys.ASYNC_UPLOADS, newAsyncUploads);
        });
    }

    removeAsyncUploadById(uploadIdToRemove: Id): FutureData<void> {
        return this.getAsyncUploads().flatMap(asyncUploadsArray => {
            const restAsyncUploads: GlassAsyncUpload[] = asyncUploadsArray.filter(
                uploadToBeDeleted => uploadToBeDeleted.uploadId !== uploadIdToRemove
            );
            return this.dataStoreClient.saveObject(DataStoreKeys.ASYNC_UPLOADS, restAsyncUploads);
        });
    }

    removeAsyncUploads(uploadIdsToRemove: Id[]): FutureData<void> {
        return this.getAsyncUploads().flatMap(asyncUploadsArray => {
            const restAsyncUploads: GlassAsyncUpload[] = asyncUploadsArray.filter(
                uploadToBeDeleted => !uploadIdsToRemove.includes(uploadToBeDeleted.uploadId)
            );
            return this.dataStoreClient.saveObject(DataStoreKeys.ASYNC_UPLOADS, restAsyncUploads);
        });
    }

    incrementAsyncUploadAttemptsAndResetStatus(uploadId: Id): FutureData<void> {
        return this.dataStoreClient
            .listCollection<GlassAsyncUpload>(DataStoreKeys.ASYNC_UPLOADS)
            .flatMap(asyncUploadsArray => {
                const asyncUploadToUpdate = asyncUploadsArray.find(asyncUpload => asyncUpload.uploadId === uploadId);
                if (asyncUploadToUpdate) {
                    const restAsyncUploads: GlassAsyncUpload[] = asyncUploadsArray.filter(
                        uploadIdToBeUpdated => uploadIdToBeUpdated.uploadId !== uploadId
                    );
                    const updatedAsyncUploads: GlassAsyncUpload[] = [
                        ...restAsyncUploads,
                        {
                            ...asyncUploadToUpdate,
                            attempts: asyncUploadToUpdate.attempts + 1,
                            status: "PENDING",
                        },
                    ];
                    return this.dataStoreClient.saveObject(DataStoreKeys.ASYNC_UPLOADS, updatedAsyncUploads);
                } else {
                    return Future.success(undefined);
                }
            });
    }
}

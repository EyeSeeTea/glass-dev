import { Future, FutureData } from "../../domain/entities/Future";
import { GlassAsyncUpload, GlassAsyncUploadStatus } from "../../domain/entities/GlassAsyncUploads";
import { Id } from "../../domain/entities/Ref";
import { GlassAsyncUploadsRepository } from "../../domain/repositories/GlassAsyncUploadsRepository";
import { Maybe } from "../../utils/ts-utils";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";

const INITIAL_ASYNC_UPLOAD_STATE: GlassAsyncUpload = {
    primaryUploadId: "",
    secondaryUploadId: "",
    attempts: 0,
    status: "PENDING",
};

export class GlassAsyncUploadsDefaultRepository implements GlassAsyncUploadsRepository {
    constructor(private dataStoreClient: DataStoreClient) {}

    getAsyncUploads(): FutureData<GlassAsyncUpload[]> {
        return this.dataStoreClient.listCollection<GlassAsyncUpload>(DataStoreKeys.ASYNC_UPLOADS);
    }

    getById(uploadId: Id): FutureData<GlassAsyncUpload | undefined> {
        return this.getAsyncUploads().map(asyncUploadsArray =>
            asyncUploadsArray.find(
                asyncUpload => asyncUpload.primaryUploadId === uploadId || asyncUpload.secondaryUploadId === uploadId
            )
        );
    }

    setStatus(uploadId: Id, newStatus: GlassAsyncUploadStatus): FutureData<void> {
        return this.getAsyncUploads().flatMap(asyncUploadsArray => {
            const newAsyncUploads: GlassAsyncUpload[] = asyncUploadsArray.map(asyncUpload => {
                if (asyncUpload.primaryUploadId === uploadId || asyncUpload.secondaryUploadId === uploadId) {
                    return {
                        ...asyncUpload,
                        status: newStatus,
                    };
                } else {
                    return asyncUpload;
                }
            });
            return this.dataStoreClient.saveObject(DataStoreKeys.ASYNC_UPLOADS, newAsyncUploads).flatMap(() => {
                return Future.success(undefined);
            });
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
                    primaryUploadId: primaryUploadId || INITIAL_ASYNC_UPLOAD_STATE.primaryUploadId,
                    secondaryUploadId: secondaryUploadId || INITIAL_ASYNC_UPLOAD_STATE.secondaryUploadId,
                },
            ];
            return this.dataStoreClient.saveObject(DataStoreKeys.ASYNC_UPLOADS, newAsyncUploads).flatMap(() => {
                return Future.success(undefined);
            });
        });
    }

    removeAsyncUploadById(uploadIdToRemove: Id): FutureData<void> {
        return this.getAsyncUploads().flatMap(asyncUploadsArray => {
            const restAsyncUploads: GlassAsyncUpload[] = asyncUploadsArray.filter(
                uploadIdToBeDeleted =>
                    uploadIdToBeDeleted.primaryUploadId !== uploadIdToRemove &&
                    uploadIdToBeDeleted.secondaryUploadId !== uploadIdToRemove
            );
            return this.dataStoreClient.saveObject(DataStoreKeys.ASYNC_UPLOADS, restAsyncUploads).flatMap(() => {
                return Future.success(undefined);
            });
        });
    }

    removeAsyncUploads(uploadIdsToRemove: Id[]): FutureData<void> {
        return this.getAsyncUploads().flatMap(asyncUploadsArray => {
            const restAsyncUploads: GlassAsyncUpload[] = asyncUploadsArray.filter(
                uploadIdToBeDeleted =>
                    !uploadIdsToRemove.includes(uploadIdToBeDeleted.primaryUploadId) &&
                    !uploadIdsToRemove.includes(uploadIdToBeDeleted.secondaryUploadId)
            );
            return this.dataStoreClient.saveObject(DataStoreKeys.ASYNC_UPLOADS, restAsyncUploads).flatMap(() => {
                return Future.success(undefined);
            });
        });
    }

    incrementAsyncUploadAttemptsAndResetStatus(uploadId: Id): FutureData<void> {
        return this.dataStoreClient
            .listCollection<GlassAsyncUpload>(DataStoreKeys.ASYNC_UPLOADS)
            .flatMap(asyncUploadsArray => {
                const asyncUploadToUpdate = asyncUploadsArray.find(
                    asyncUpload =>
                        asyncUpload.primaryUploadId === uploadId || asyncUpload.secondaryUploadId === uploadId
                );
                if (asyncUploadToUpdate) {
                    const restAsyncUploads: GlassAsyncUpload[] = asyncUploadsArray.filter(
                        uploadIdToBeUpdated =>
                            uploadIdToBeUpdated.primaryUploadId !== uploadId &&
                            uploadIdToBeUpdated.secondaryUploadId !== uploadId
                    );
                    const updatedAsyncUploads: GlassAsyncUpload[] = [
                        ...restAsyncUploads,
                        {
                            ...asyncUploadToUpdate,
                            attempts: asyncUploadToUpdate.attempts + 1,
                            status: "PENDING",
                        },
                    ];
                    return this.dataStoreClient
                        .saveObject(DataStoreKeys.ASYNC_UPLOADS, updatedAsyncUploads)
                        .flatMap(() => {
                            return Future.success(undefined);
                        });
                } else {
                    return Future.success(undefined);
                }
            });
    }
}

import { Future, FutureData } from "../../domain/entities/Future";
import { GlassAsyncDeletion, GlassAsyncDeletionStatus } from "../../domain/entities/GlassAsyncDeletions";
import { Id } from "../../domain/entities/Ref";
import { GlassAsyncDeletionsRepository } from "../../domain/repositories/GlassAsyncDeletionsRepository";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";

const INITIAL_ASYNC_DELETION_STATE: GlassAsyncDeletion = {
    uploadId: "",
    attempts: 0,
    status: "PENDING",
};

export class GlassAsyncDeletionsDefaultRepository implements GlassAsyncDeletionsRepository {
    constructor(private dataStoreClient: DataStoreClient) {}

    getAsyncDeletions(): FutureData<GlassAsyncDeletion[]> {
        return this.dataStoreClient.listCollection<GlassAsyncDeletion>(DataStoreKeys.ASYNC_DELETIONS);
    }

    getById(uploadId: Id): FutureData<GlassAsyncDeletion | undefined> {
        return this.dataStoreClient
            .listCollection<GlassAsyncDeletion>(DataStoreKeys.ASYNC_DELETIONS)
            .map(asyncDeletionsArray => asyncDeletionsArray.find(asyncDeletion => asyncDeletion.uploadId === uploadId));
    }

    setToAsyncDeletions(uploadIdToDelete: Id): FutureData<void> {
        return this.getAsyncDeletions().flatMap(asyncDeletionsArray => {
            const newAsyncDeletions: GlassAsyncDeletion[] = [
                ...asyncDeletionsArray,
                {
                    ...INITIAL_ASYNC_DELETION_STATE,
                    uploadId: uploadIdToDelete,
                },
            ];
            return this.dataStoreClient.saveObject(DataStoreKeys.ASYNC_DELETIONS, newAsyncDeletions).flatMap(() => {
                return Future.success(undefined);
            });
        });
    }

    removeAsyncDeletionById(uploadIdToRemove: Id): FutureData<void> {
        return this.getAsyncDeletions().flatMap(asyncDeletionsArray => {
            const restAsyncDeletions: GlassAsyncDeletion[] = asyncDeletionsArray.filter(
                uploadIdToBeDeleted => uploadIdToBeDeleted.uploadId !== uploadIdToRemove
            );

            return this.dataStoreClient.saveObject(DataStoreKeys.ASYNC_DELETIONS, restAsyncDeletions).flatMap(() => {
                return Future.success(undefined);
            });
        });
    }

    removeAsyncDeletions(uploadIdToRemove: Id[]): FutureData<void> {
        return this.dataStoreClient
            .listCollection<GlassAsyncDeletion>(DataStoreKeys.ASYNC_DELETIONS)
            .flatMap(asyncDeletionsArray => {
                const restAsyncDeletions: GlassAsyncDeletion[] = asyncDeletionsArray.filter(
                    uploadIdToBeDeleted => !uploadIdToRemove.includes(uploadIdToBeDeleted.uploadId)
                );
                return this.dataStoreClient
                    .saveObject(DataStoreKeys.ASYNC_DELETIONS, restAsyncDeletions)
                    .flatMap(() => {
                        return Future.success(undefined);
                    });
            });
    }

    setStatus(uploadIds: Id[], newStatus: GlassAsyncDeletionStatus): FutureData<void> {
        return this.dataStoreClient
            .listCollection<GlassAsyncDeletion>(DataStoreKeys.ASYNC_DELETIONS)
            .flatMap(asyncDeletionsArray => {
                const newAsyncDeletions: GlassAsyncDeletion[] = asyncDeletionsArray.map(asyncDeletion => {
                    if (uploadIds.includes(asyncDeletion.uploadId)) {
                        return {
                            ...asyncDeletion,
                            status: newStatus,
                        };
                    } else {
                        return asyncDeletion;
                    }
                });
                return this.dataStoreClient.saveObject(DataStoreKeys.ASYNC_DELETIONS, newAsyncDeletions).flatMap(() => {
                    return Future.success(undefined);
                });
            });
    }

    incrementAsyncDeletionAttemptsAndResetStatus(uploadId: Id): FutureData<void> {
        return this.dataStoreClient
            .listCollection<GlassAsyncDeletion>(DataStoreKeys.ASYNC_DELETIONS)
            .flatMap(asyncDeletionsArray => {
                const uploadIdToUpdate = asyncDeletionsArray.find(asyncDeletion => asyncDeletion.uploadId === uploadId);
                if (uploadIdToUpdate) {
                    const newAsyncDeletions: GlassAsyncDeletion[] = [
                        ...asyncDeletionsArray,
                        {
                            ...uploadIdToUpdate,
                            attempts: uploadIdToUpdate.attempts + 1,
                            status: "PENDING",
                        },
                    ];
                    return this.dataStoreClient
                        .saveObject(DataStoreKeys.ASYNC_DELETIONS, newAsyncDeletions)
                        .flatMap(() => {
                            return Future.success(undefined);
                        });
                } else {
                    return Future.success(undefined);
                }
            });
    }
}

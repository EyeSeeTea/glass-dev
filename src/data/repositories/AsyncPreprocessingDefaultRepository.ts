import {
    AsyncPreprocessing,
    AsyncPreprocessingStatus,
    INITIAL_ASYNC_PREPROCESSING_STATE,
} from "../../domain/entities/AsyncPreprocessing";
import { Future, FutureData } from "../../domain/entities/Future";
import { Id } from "../../domain/entities/Ref";
import { AsyncPreprocessingRepository } from "../../domain/repositories/AsyncPreprocessingRepository";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";

export class AsyncPreprocessingDefaultRepository implements AsyncPreprocessingRepository {
    constructor(private dataStoreClient: DataStoreClient) {}

    getAll(): FutureData<AsyncPreprocessing[]> {
        return this.dataStoreClient.listCollection<AsyncPreprocessing>(DataStoreKeys.ASYNC_PREPROCESSING);
    }

    getById(uploadId: Id): FutureData<AsyncPreprocessing | undefined> {
        return this.getAll().map(asyncPreprocessingArray =>
            asyncPreprocessingArray.find(asyncPreprocessing => asyncPreprocessing.uploadId === uploadId)
        );
    }

    set(uploadId: Id): FutureData<void> {
        return this.getAll().flatMap(asyncPreprocessingArray => {
            const newAsyncPreprocessing: AsyncPreprocessing[] = [
                ...asyncPreprocessingArray,
                {
                    ...INITIAL_ASYNC_PREPROCESSING_STATE,
                    uploadId: uploadId,
                },
            ];
            return this.dataStoreClient.saveObject(DataStoreKeys.ASYNC_PREPROCESSING, newAsyncPreprocessing);
        });
    }

    updateStatus(uploadId: Id, newStatus: AsyncPreprocessingStatus, errorMessage?: string): FutureData<void> {
        return this.getAll().flatMap(asyncPreprocessingArray => {
            const newAsyncPreprocessing: AsyncPreprocessing[] = asyncPreprocessingArray.map(asyncPreprocessing => {
                return asyncPreprocessing.uploadId === uploadId
                    ? {
                          ...asyncPreprocessing,
                          status: newStatus,
                          lastUpdatedAt: new Date().toISOString(),
                          errorMessage: errorMessage,
                      }
                    : asyncPreprocessing;
            });
            return this.dataStoreClient.saveObject(DataStoreKeys.ASYNC_PREPROCESSING, newAsyncPreprocessing);
        });
    }

    incrementAttemptsAndResetStatusById(uploadId: Id, errorMessage?: string): FutureData<void> {
        return this.getAll().flatMap(asyncPreprocessingArray => {
            const asyncPreprocessingToUpdate = asyncPreprocessingArray.find(
                asyncPreprocessing => asyncPreprocessing.uploadId === uploadId
            );
            if (asyncPreprocessingToUpdate) {
                const restAsyncPreprocessing: AsyncPreprocessing[] = asyncPreprocessingArray.filter(
                    asyncPreprocessing => asyncPreprocessing.uploadId !== uploadId
                );
                const updatedAsyncPreprocessing: AsyncPreprocessing[] = [
                    ...restAsyncPreprocessing,
                    {
                        ...asyncPreprocessingToUpdate,
                        attempts: asyncPreprocessingToUpdate.attempts + 1,
                        status: "PENDING",
                        lastUpdatedAt: new Date().toISOString(),
                        errorMessage: errorMessage,
                    },
                ];
                return this.dataStoreClient.saveObject(DataStoreKeys.ASYNC_PREPROCESSING, updatedAsyncPreprocessing);
            } else {
                return Future.success(undefined);
            }
        });
    }

    removeById(uploadId: Id): FutureData<void> {
        return this.getAll().flatMap(asyncPreprocessingArray => {
            const restAsyncPreprocessing: AsyncPreprocessing[] = asyncPreprocessingArray.filter(
                asyncPreprocessing => asyncPreprocessing.uploadId !== uploadId
            );
            return this.dataStoreClient.saveObject(DataStoreKeys.ASYNC_PREPROCESSING, restAsyncPreprocessing);
        });
    }

    remove(uploadIdsToRemove: Id[]): FutureData<void> {
        return this.getAll().flatMap(asyncPreprocessingArray => {
            const restAsyncPreprocessing: AsyncPreprocessing[] = asyncPreprocessingArray.filter(
                asyncPreprocessing => !uploadIdsToRemove.includes(asyncPreprocessing.uploadId)
            );
            return this.dataStoreClient.saveObject(DataStoreKeys.ASYNC_PREPROCESSING, restAsyncPreprocessing);
        });
    }
}

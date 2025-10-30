import { AsyncPreprocessing, AsyncPreprocessingStatus } from "../entities/AsyncPreprocessing";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";

export interface AsyncPreprocessingRepository {
    getAll(): FutureData<AsyncPreprocessing[]>;
    getById(uploadId: Id): FutureData<AsyncPreprocessing | undefined>;
    set(uploadId: Id): FutureData<void>;
    updateStatus(uploadId: Id, newStatus: AsyncPreprocessingStatus, errorMessage?: string): FutureData<void>;
    incrementAttemptsAndResetStatusById(uploadId: Id, errorMessage?: string): FutureData<void>;
    removeById(uploadId: Id): FutureData<void>;
    remove(uploadIdsToRemove: Id[]): FutureData<void>;
}

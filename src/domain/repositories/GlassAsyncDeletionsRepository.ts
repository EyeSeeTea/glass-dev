import { FutureData } from "../entities/Future";
import { GlassAsyncDeletion, GlassAsyncDeletionStatus } from "../entities/GlassAsyncDeletions";
import { Id } from "../entities/Ref";

export interface GlassAsyncDeletionsRepository {
    getAsyncDeletions(): FutureData<GlassAsyncDeletion[]>;
    getById(uploadId: Id): FutureData<GlassAsyncDeletion | undefined>;
    setAsyncDeletions(uploadIdsToDelete: Id[]): FutureData<void>;
    removeAsyncDeletions(uploadIdToRemove: Id[]): FutureData<void>;
    setStatus(uploadIds: Id[], newStatus: GlassAsyncDeletionStatus): FutureData<void>;
    incrementAsyncDeletionAttemptsAndResetStatus(uploadId: Id): FutureData<void>;
}

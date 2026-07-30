import { Id } from "./Ref";

export type GlassAsyncDeletionStatus = "PENDING" | "DELETING";

export type GlassAsyncDeletion = {
    uploadId: Id;
    attempts: number;
    status: GlassAsyncDeletionStatus;
    deletingStartedAt?: string; // ISO timestamp recorded when status is set to DELETING
};

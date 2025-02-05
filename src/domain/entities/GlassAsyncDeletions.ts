import { Id } from "./Ref";

export type GlassAsyncDeletionStatus = "PENDING" | "DELETING";

export type GlassAsyncDeletion = {
    uploadId: Id;
    attempts: number;
    status: GlassAsyncDeletionStatus;
};

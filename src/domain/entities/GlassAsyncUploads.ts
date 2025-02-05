import { Id } from "./Ref";

export type GlassAsyncUploadStatus = "PENDING" | "UPLOADING";

export type GlassAsyncUpload = {
    primaryUploadId: Id;
    secondaryUploadId: Id;
    attempts: number;
    status: GlassAsyncUploadStatus;
};

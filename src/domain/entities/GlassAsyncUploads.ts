import { Id } from "./Ref";

export type GlassAsyncUploadStatus = "PENDING" | "UPLOADING";

type GlassAsyncBaseUpload = {
    uploadId: Id;
    attempts: number;
    status: GlassAsyncUploadStatus;
};

export type GlassAsyncPrimaryUpload = GlassAsyncBaseUpload & {
    type: "primary";
};

export type GlassAsyncSecondaryUpload = GlassAsyncBaseUpload & {
    type: "secondary";
};

export type GlassAsyncUpload = GlassAsyncPrimaryUpload | GlassAsyncSecondaryUpload;

export const INITIAL_ASYNC_UPLOAD_STATE: GlassAsyncBaseUpload = {
    uploadId: "",
    attempts: 0,
    status: "PENDING",
};

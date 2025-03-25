import { Maybe } from "../../utils/ts-utils";
import { FutureData } from "../entities/Future";
import { GlassAsyncUpload, GlassAsyncUploadStatus } from "../entities/GlassAsyncUploads";
import { Id } from "../entities/Ref";

export interface GlassAsyncUploadsRepository {
    getAsyncUploads(): FutureData<GlassAsyncUpload[]>;
    getById(uploadId: Id): FutureData<GlassAsyncUpload | undefined>;
    setStatus(uploadId: Id, newStatus: GlassAsyncUploadStatus): FutureData<void>;
    setAsyncUploadById(primaryUploadId: Maybe<Id>, secondaryUploadId: Maybe<Id>): FutureData<void>;
    removeAsyncUploadById(uploadIdToRemove: Id): FutureData<void>;
    removeAsyncUploads(uploadIdsToRemove: Id[]): FutureData<void>;
    incrementAsyncUploadAttemptsAndResetStatus(uploadId: Id): FutureData<void>;
}

import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassAsyncUploadStatus } from "../entities/GlassAsyncUploads";
import { Id } from "../entities/Ref";
import { GlassAsyncUploadsRepository } from "../repositories/GlassAsyncUploadsRepository";

export class SetAsyncUploadStatusUseCase implements UseCase {
    constructor(private glassAsyncUploadsRepository: GlassAsyncUploadsRepository) {}

    public execute(uploadId: Id, status: GlassAsyncUploadStatus): FutureData<void> {
        return this.glassAsyncUploadsRepository.setStatus(uploadId, status);
    }
}

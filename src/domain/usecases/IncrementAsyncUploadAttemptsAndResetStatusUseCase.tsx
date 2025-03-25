import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { GlassAsyncUploadsRepository } from "../repositories/GlassAsyncUploadsRepository";

export class IncrementAsyncUploadAttemptsAndResetStatusUseCase implements UseCase {
    constructor(private glassAsyncUploadsRepository: GlassAsyncUploadsRepository) {}

    public execute(uploadId: Id): FutureData<void> {
        return this.glassAsyncUploadsRepository.incrementAsyncUploadAttemptsAndResetStatus(uploadId);
    }
}

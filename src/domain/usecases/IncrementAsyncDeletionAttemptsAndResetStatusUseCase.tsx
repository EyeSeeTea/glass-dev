import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { GlassAsyncDeletionsRepository } from "../repositories/GlassAsyncDeletionsRepository";

export class IncrementAsyncDeletionAttemptsAndResetStatusUseCase implements UseCase {
    constructor(private glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository) {}

    public execute(uploadId: Id): FutureData<void> {
        return this.glassAsyncDeletionsRepository.incrementAsyncDeletionAttemptsAndResetStatus(uploadId);
    }
}

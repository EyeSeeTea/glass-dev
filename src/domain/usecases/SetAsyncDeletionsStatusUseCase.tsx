import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassAsyncDeletionStatus } from "../entities/GlassAsyncDeletions";
import { Id } from "../entities/Ref";
import { GlassAsyncDeletionsRepository } from "../repositories/GlassAsyncDeletionsRepository";

export class SetAsyncDeletionsStatusUseCase implements UseCase {
    constructor(private glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository) {}

    public execute(uploadIds: Id[], status: GlassAsyncDeletionStatus): FutureData<void> {
        return this.glassAsyncDeletionsRepository.setStatus(uploadIds, status);
    }
}

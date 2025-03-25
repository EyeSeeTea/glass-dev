import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { GlassAsyncDeletionsRepository } from "../repositories/GlassAsyncDeletionsRepository";

export class RemoveAsyncDeletionByIdUseCase implements UseCase {
    constructor(private glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository) {}

    public execute(uploadIdToRemove: Id): FutureData<void> {
        return this.glassAsyncDeletionsRepository.removeAsyncDeletionById(uploadIdToRemove);
    }
}

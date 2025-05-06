import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { GlassAsyncDeletionsRepository } from "../repositories/GlassAsyncDeletionsRepository";

export class RemoveAsyncDeletionsUseCase implements UseCase {
    constructor(private glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository) {}

    public execute(uploadIdsToRemove: Id[]): FutureData<void> {
        return this.glassAsyncDeletionsRepository.removeAsyncDeletions(uploadIdsToRemove);
    }
}

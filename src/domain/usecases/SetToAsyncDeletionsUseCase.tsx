import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { GlassAsyncDeletionsRepository } from "../repositories/GlassAsyncDeletionsRepository";

export class SetToAsyncDeletionsUseCase implements UseCase {
    constructor(private glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository) {}

    public execute(uploadIdsToDelete: Id[]): FutureData<void> {
        return this.glassAsyncDeletionsRepository.setAsyncDeletions(uploadIdsToDelete);
    }
}

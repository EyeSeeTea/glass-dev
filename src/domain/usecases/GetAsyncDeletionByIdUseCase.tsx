import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassAsyncDeletion } from "../entities/GlassAsyncDeletions";
import { Id } from "../entities/Ref";
import { GlassAsyncDeletionsRepository } from "../repositories/GlassAsyncDeletionsRepository";

export class GetAsyncDeletionByIdUseCase implements UseCase {
    constructor(private glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository) {}

    public execute(id: Id): FutureData<GlassAsyncDeletion | undefined> {
        return this.glassAsyncDeletionsRepository.getById(id);
    }
}

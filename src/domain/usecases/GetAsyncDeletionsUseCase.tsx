import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassAsyncDeletion } from "../entities/GlassAsyncDeletions";
import { GlassAsyncDeletionsRepository } from "../repositories/GlassAsyncDeletionsRepository";

export class GetAsyncDeletionsUseCase implements UseCase {
    constructor(private glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository) {}

    public execute(): FutureData<GlassAsyncDeletion[]> {
        return this.glassAsyncDeletionsRepository.getAsyncDeletions();
    }
}

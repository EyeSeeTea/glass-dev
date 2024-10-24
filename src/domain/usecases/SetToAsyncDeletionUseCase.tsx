import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class SetToAsyncDeletionUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute(uploadIdToDelete: Id): FutureData<Id> {
        return this.glassUploadsRepository.setAsyncDeletion(uploadIdToDelete);
    }
}

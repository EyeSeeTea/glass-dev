import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class SetToAsyncDeletionsUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute(uploadIdsToDelete: Id[]): FutureData<Id[]> {
        return this.glassUploadsRepository.setAsyncDeletions(uploadIdsToDelete);
    }
}

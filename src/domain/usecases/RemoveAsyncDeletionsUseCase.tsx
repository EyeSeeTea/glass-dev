import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class RemoveAsyncDeletionsUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute(uploadIdsToRemove: Id[]): FutureData<Id[]> {
        console.log('uploadIdsToRemove in RemoveAsyncDeletionsUseCase: ',uploadIdsToRemove);
        return this.glassUploadsRepository.removeAsyncDeletions(uploadIdsToRemove);
    }
}

import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class SetMultipleUploadErrorAsyncDeletingUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute(uploadIds: Id[]): FutureData<void> {
        return this.glassUploadsRepository.setMultipleErrorAsyncDeleting(uploadIds);
    }
}

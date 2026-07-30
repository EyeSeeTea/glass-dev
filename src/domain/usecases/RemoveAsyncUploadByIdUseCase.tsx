import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { GlassAsyncUploadsRepository } from "../repositories/GlassAsyncUploadsRepository";

export class RemoveAsyncUploadByIdUseCase implements UseCase {
    constructor(
        private repositories: {
            glassAsyncUploadsRepository: GlassAsyncUploadsRepository;
        }
    ) {}

    public execute(uploadIdToRemove: Id): FutureData<void> {
        return this.repositories.glassAsyncUploadsRepository.removeAsyncUploadById(uploadIdToRemove);
    }
}

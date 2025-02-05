import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { GlassAsyncUploadsRepository } from "../repositories/GlassAsyncUploadsRepository";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class RemoveAsyncUploadByIdUseCase implements UseCase {
    constructor(
        private repositories: {
            glassAsyncUploadsRepository: GlassAsyncUploadsRepository;
            glassUploadsRepository: GlassUploadsRepository;
        }
    ) {}

    public execute(uploadIdToRemove: Id): FutureData<void> {
        return this.repositories.glassAsyncUploadsRepository.removeAsyncUploadById(uploadIdToRemove);
    }
}

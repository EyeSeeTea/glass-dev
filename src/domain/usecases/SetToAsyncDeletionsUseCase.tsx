import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { GlassAsyncDeletionsRepository } from "../repositories/GlassAsyncDeletionsRepository";
import { GlassAsyncUploadsRepository } from "../repositories/GlassAsyncUploadsRepository";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class SetToAsyncDeletionsUseCase implements UseCase {
    constructor(
        private repositories: {
            glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository;
            glassAsyncUploadsRepository: GlassAsyncUploadsRepository;
            glassUploadsRepository: GlassUploadsRepository;
        }
    ) {}

    public execute(uploadIdToDelete: Id): FutureData<void> {
        return this.repositories.glassAsyncUploadsRepository.getAsyncUploads().flatMap(asyncUploads => {
            const isUploadInAsyncUploads = asyncUploads.find(upload => upload.uploadId === uploadIdToDelete);

            if (isUploadInAsyncUploads) {
                return this.repositories.glassAsyncUploadsRepository
                    .removeAsyncUploadById(uploadIdToDelete)
                    .flatMap(() => {
                        return this.repositories.glassAsyncDeletionsRepository.setToAsyncDeletions(uploadIdToDelete);
                    });
            } else {
                return this.repositories.glassAsyncDeletionsRepository.setToAsyncDeletions(uploadIdToDelete);
            }
        });
    }
}

import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { GlassAsyncUploadsRepository } from "../repositories/GlassAsyncUploadsRepository";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class RemoveAsyncUploadsUseCase implements UseCase {
    constructor(
        private repositories: {
            glassAsyncUploadsRepository: GlassAsyncUploadsRepository;
            glassUploadsRepository: GlassUploadsRepository;
        }
    ) {}

    public execute(uploadIdsToRemove: Id[]): FutureData<void> {
        return this.repositories.glassAsyncUploadsRepository.removeAsyncUploads(uploadIdsToRemove).flatMap(() => {
            return Future.sequential(
                uploadIdsToRemove.map(uploadId => {
                    return this.repositories.glassUploadsRepository.setStatus(uploadId, "UPLOADED");
                })
            ).flatMap(() => {
                return Future.success(undefined);
            });
        });
    }
}

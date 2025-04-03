import { UseCase } from "../../CompositionRoot";
import { Maybe } from "../../utils/ts-utils";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { GlassAsyncUploadsRepository } from "../repositories/GlassAsyncUploadsRepository";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class SetAsyncUploadsUseCase implements UseCase {
    constructor(
        private repositories: {
            glassAsyncUploadsRepository: GlassAsyncUploadsRepository;
            glassUploadsRepository: GlassUploadsRepository;
        }
    ) {}

    public execute(primaryUploadId: Maybe<Id>, secondaryUploadId: Maybe<Id>): FutureData<void> {
        return this.repositories.glassAsyncUploadsRepository.setAsyncUploadById(primaryUploadId, secondaryUploadId);
    }
}

import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassUploads } from "../entities/GlassUploads";
import { Id } from "../entities/Ref";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class GetGlassUploadsByCorrespondingRisUploadIdUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute(correspondingRisUploadId: Id): FutureData<GlassUploads> {
        return this.glassUploadsRepository.getByCorrespondingRisUploadId(correspondingRisUploadId);
    }
}

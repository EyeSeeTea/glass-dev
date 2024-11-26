import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassUploads } from "../entities/GlassUploads";
import { Id } from "../entities/Ref";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class GetGlassUploadByIdUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute(uploadId: Id): FutureData<GlassUploads> {
        return this.glassUploadsRepository.getById(uploadId);
    }
}

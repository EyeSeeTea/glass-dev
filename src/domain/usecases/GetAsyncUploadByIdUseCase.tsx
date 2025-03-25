import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassAsyncUpload } from "../entities/GlassAsyncUploads";
import { Id } from "../entities/Ref";
import { GlassAsyncUploadsRepository } from "../repositories/GlassAsyncUploadsRepository";

export class GetAsyncUploadByIdUseCase implements UseCase {
    constructor(private glassAsyncUploadsRepository: GlassAsyncUploadsRepository) {}

    public execute(id: Id): FutureData<GlassAsyncUpload | undefined> {
        return this.glassAsyncUploadsRepository.getById(id);
    }
}

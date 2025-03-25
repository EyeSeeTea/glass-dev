import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassAsyncUpload } from "../entities/GlassAsyncUploads";
import { GlassAsyncUploadsRepository } from "../repositories/GlassAsyncUploadsRepository";

export class GetAsyncUploadsUseCase implements UseCase {
    constructor(private glassAsyncUploadsRepository: GlassAsyncUploadsRepository) {}

    public execute(): FutureData<GlassAsyncUpload[]> {
        return this.glassAsyncUploadsRepository.getAsyncUploads();
    }
}

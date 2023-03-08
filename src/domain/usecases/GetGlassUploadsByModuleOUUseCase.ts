import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassUploads } from "../entities/GlassUploads";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class GetGlassUploadsByModuleOUUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute(module: string, orgUnit: string): FutureData<GlassUploads[]> {
        return this.glassUploadsRepository.getUploadsByModuleOU(module, orgUnit);
    }
}

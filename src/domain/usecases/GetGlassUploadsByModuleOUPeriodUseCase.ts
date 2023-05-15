import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassUploads } from "../entities/GlassUploads";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class GetGlassUploadsByModuleOUPeriodUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute(module: string, orgUnit: string, period: string): FutureData<GlassUploads[]> {
        return this.glassUploadsRepository.getUploadsByModuleOUPeriod(module, orgUnit, period);
    }
}

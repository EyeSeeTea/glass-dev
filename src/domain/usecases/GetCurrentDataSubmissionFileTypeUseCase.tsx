import { Id } from "@eyeseetea/d2-api";
import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";
import { GlassUploads } from "../entities/GlassUploads";

export class GetCurrentDataSubmissionFileTypeUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute(module: string, dataSubmissionId: Id, period: string): FutureData<GlassUploads[]> {
        return this.glassUploadsRepository.getUploadsByModuleDataSubmissionPeriod(module, dataSubmissionId, period);
    }
}

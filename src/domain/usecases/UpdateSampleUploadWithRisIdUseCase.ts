import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class UpdateSampleUploadWithRisIdUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute(sampleUploadId: string, risUploadId: string): FutureData<void> {
        return this.glassUploadsRepository.updateSampleUploadWithRisId(sampleUploadId, risUploadId);
    }
}

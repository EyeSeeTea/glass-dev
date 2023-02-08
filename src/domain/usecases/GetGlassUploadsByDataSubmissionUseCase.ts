import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassUploads } from "../entities/GlassUploads";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class GetGlassUploadsByDataSubmissionUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute(dataSubmissionId: string): FutureData<GlassUploads[]> {
        return this.glassUploadsRepository.getAll().map(uploads => {
            return uploads.filter(upload => upload.dataSubmission === dataSubmissionId);
        });
    }
}

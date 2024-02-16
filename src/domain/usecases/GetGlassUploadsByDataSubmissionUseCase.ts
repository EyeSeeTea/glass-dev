import { UseCase } from "../../CompositionRoot";
import { FutureData, Future } from "../entities/Future";
import { GlassUploads } from "../entities/GlassUploads";
import { GlassDataSubmissionsRepository } from "../repositories/GlassDataSubmissionRepository";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

const AMR_AGG = "AVnpk4xiXGG";
const AMR_I = "IVnpk5xiXGG";

export class GetGlassUploadsByDataSubmissionUseCase implements UseCase {
    constructor(
        private glassUploadsRepository: GlassUploadsRepository,
        private glassDataSubmissionRepository: GlassDataSubmissionsRepository
    ) {}

    public execute(orgUnit: string, period: string): FutureData<GlassUploads[]> {
        return Future.joinObj({
            amrAgg: this.glassDataSubmissionRepository.getSpecificDataSubmission(AMR_AGG, orgUnit, period),
            amrInd: this.glassDataSubmissionRepository.getSpecificDataSubmission(AMR_I, orgUnit, period),
        }).flatMap(({ amrAgg, amrInd }) => {
            return this.glassUploadsRepository.getAll().map(uploads => {
                return uploads.filter(
                    upload => upload.dataSubmission === amrAgg[0]?.id || upload.dataSubmission === amrInd[0]?.id
                );
            });
        });
    }
}

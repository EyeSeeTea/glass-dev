import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassDataSubmission } from "../entities/GlassDataSubmission";
import { GlassDataSubmissionsRepository } from "../repositories/GlassDataSubmissionRepository";

export class GetOpenDataSubmissionsByOUUseCase implements UseCase {
    constructor(private glassDataSubmissionRepository: GlassDataSubmissionsRepository) {}

    public execute(orgUnit: string): FutureData<GlassDataSubmission[]> {
        return this.glassDataSubmissionRepository.getOpenDataSubmissionsByOU(orgUnit);
    }
}

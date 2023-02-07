import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassSubmissions } from "../entities/GlassSubmissions";
import { GlassSubmissionsRepository } from "../repositories/GlassSubmissionsRepository";

export class GetGlassSubmissionsByCallUseCase implements UseCase {
    constructor(private glassSubmissionsRepository: GlassSubmissionsRepository) {}

    public execute(callId: string): FutureData<GlassSubmissions[]> {
        return this.glassSubmissionsRepository.getAll().map(submissions => {
            return submissions.filter(submission => submission.call === callId);
        });
    }
}

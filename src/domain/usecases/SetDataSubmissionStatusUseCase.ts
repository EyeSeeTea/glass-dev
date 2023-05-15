import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { DataSubmissionStatusTypes } from "../entities/GlassDataSubmission";
import { GlassDataSubmissionsRepository } from "../repositories/GlassDataSubmissionRepository";

export class SetDataSubmissionStatusUseCase implements UseCase {
    constructor(private glassDataSubmissionRepository: GlassDataSubmissionsRepository) {}

    public execute(id: string, status: DataSubmissionStatusTypes): FutureData<void> {
        return this.glassDataSubmissionRepository.setStatus(id, status);
    }
}

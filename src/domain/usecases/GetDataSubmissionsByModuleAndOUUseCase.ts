import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassDataSubmission } from "../entities/GlassDataSubmission";
import { GlassDataSubmissionsRepository } from "../repositories/GlassDataSubmissionRepository";

export class GetDataSubmissionsByModuleAndOUUseCase implements UseCase {
    constructor(private glassDataSubmissionRepository: GlassDataSubmissionsRepository) {}

    public execute(module: string, orgUnit: string): FutureData<GlassDataSubmission[]> {
        return this.glassDataSubmissionRepository.getDataSubmissionsByModuleAndOU(module, orgUnit);
    }
}

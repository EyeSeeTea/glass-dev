import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassSubmissions } from "../entities/GlassSubmissions";
import { GlassSubmissionsRepository } from "../repositories/GlassSubmissionsRepository";

export class SetGlassSubmissionsUseCase implements UseCase {
    constructor(private glassSubmissionsRepository: GlassSubmissionsRepository) {}

    public execute(submissions: GlassSubmissions[]): FutureData<void> {
        return this.glassSubmissionsRepository.save(submissions);
    }
}

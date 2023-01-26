import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassSubmissions } from "../entities/GlassSubmissions";
import { GlassSubmissionsRepository } from "../repositories/GlassSubmissionsRepository";

export class GetGlassSubmissionsUseCase implements UseCase {
    constructor(private glassSubmissionsRepository: GlassSubmissionsRepository) {}

    public execute(): FutureData<GlassSubmissions[]> {
        return this.glassSubmissionsRepository.getAll();
    }
}

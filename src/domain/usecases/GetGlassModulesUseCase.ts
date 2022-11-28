import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassModule } from "../entities/GlassModule";
import { GlassModuleRepository } from "../repositories/GlassModuleRepository";

export class GetGlassModulesUseCase implements UseCase {
    constructor(private glassModuleRepository: GlassModuleRepository) {}

    public execute(): FutureData<GlassModule[]> {
        return this.glassModuleRepository.getAll();
    }
}

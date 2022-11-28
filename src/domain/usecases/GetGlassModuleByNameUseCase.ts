import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassModule } from "../entities/GlassModule";
import { GlassModuleRepository } from "../repositories/GlassModuleRepository";

export class GetGlassModuleByNameUseCase implements UseCase {
    constructor(private glassModuleRepository: GlassModuleRepository) {}

    public execute(name: string): FutureData<GlassModule> {
        return this.glassModuleRepository.getByName(name);
    }
}

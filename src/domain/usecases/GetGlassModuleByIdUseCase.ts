import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassModule } from "../entities/GlassModule";
import { Id } from "../entities/Ref";
import { GlassModuleRepository } from "../repositories/GlassModuleRepository";

export class GetGlassModuleByIdUseCase implements UseCase {
    constructor(private modulesRepository: GlassModuleRepository) {}

    public execute(id: Id): FutureData<GlassModule> {
        return this.modulesRepository.getById(id);
    }
}

import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassNews } from "../entities/GlassNews";
import { GlassNewsRepository } from "../repositories/GlassNewsRepository";

export class GetGlassNewsUseCase implements UseCase {
    constructor(private glassNewsRepository: GlassNewsRepository) {}

    public execute(): FutureData<GlassNews[]> {
        return this.glassNewsRepository.getAll();
    }
}

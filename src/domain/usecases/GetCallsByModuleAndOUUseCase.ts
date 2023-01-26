import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassCall } from "../entities/GlassCallStatus";
import { GlassCallRepository } from "../repositories/GlassCallRepository";

export class GetCallsByModuleAndOUUseCase implements UseCase {
    constructor(private glassCallRepository: GlassCallRepository) {}

    public execute(module: string, orgUnit: string): FutureData<GlassCall[]> {
        return this.glassCallRepository.getCallsByModuleAndOU(module, orgUnit);
    }
}

import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassCall } from "../entities/GlassCallStatus";
import { GlassCallRepository } from "../repositories/GlassCallRepository";

export class GetSpecificCallUseCase implements UseCase {
    constructor(private glassCallRepository: GlassCallRepository) {}

    public execute(module: string, orgUnit: string, period: number): FutureData<GlassCall[]> {
        return this.glassCallRepository.getSpecificCall(module, orgUnit, period);
    }
}

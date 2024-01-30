import { FutureData } from "../../../entities/Future";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";

export class DisableAMCRecalculationsUseCase {
    constructor(private atcRepository: GlassATCRepository) {}

    public execute(): FutureData<void> {
        return this.atcRepository.disableRecalculations().toVoid();
    }
}

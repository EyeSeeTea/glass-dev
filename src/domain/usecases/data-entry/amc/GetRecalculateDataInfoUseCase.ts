import { FutureData } from "../../../entities/Future";
import { GlassATCRecalculateDataInfo } from "../../../entities/GlassAtcVersionData";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";

export class GetRecalculateDataInfoUseCase {
    constructor(private atcRepository: GlassATCRepository) {}
    public execute(): FutureData<GlassATCRecalculateDataInfo | undefined> {
        return this.atcRepository.getRecalculateDataInfo();
    }
}

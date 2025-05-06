import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassGeneralInfo } from "../entities/GlassGeneralInfo";
import { GeneralInfoRepository } from "../repositories/GeneralInfoRepository";

export class GetGeneralInformationUseCase implements UseCase {
    constructor(private generalInfoRepository: GeneralInfoRepository) {}

    public execute(): FutureData<GlassGeneralInfo> {
        return this.generalInfoRepository.get();
    }
}

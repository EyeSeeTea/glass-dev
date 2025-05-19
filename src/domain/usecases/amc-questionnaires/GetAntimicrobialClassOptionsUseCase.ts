import { UseCase } from "../../../CompositionRoot";
import { AntimicrobialClassOption } from "../../entities/amc-questionnaires/AntimicrobialClassOption";
import { FutureData } from "../../entities/Future";
import { AntimicrobialClassOptionsRepository } from "../../repositories/amc-questionnaires/AntimicrobialClassOptionsRepository";

export class GetAntimicrobialClassOptionsUseCase implements UseCase {
    constructor(private antimicrobialClassOptionsRepository: AntimicrobialClassOptionsRepository) {}

    public execute(): FutureData<AntimicrobialClassOption[]> {
        return this.antimicrobialClassOptionsRepository.get();
    }
}

import { UseCase } from "../../../CompositionRoot";
import { UNPopulation } from "../../entities/amc-questionnaires/UNPopulation";
import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";
import { UNPopulationRepository } from "../../repositories/amc-questionnaires/UNPopulationRepository";

export class GetUNPopulationUseCase implements UseCase {
    constructor(private unPopulationRepository: UNPopulationRepository) {}

    public execute(orgUnitId: Id, period: string): FutureData<UNPopulation> {
        return this.unPopulationRepository.get(orgUnitId, period);
    }
}

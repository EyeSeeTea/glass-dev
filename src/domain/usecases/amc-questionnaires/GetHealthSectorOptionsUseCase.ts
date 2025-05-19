import { UseCase } from "../../../CompositionRoot";
import { HealthSectorOption } from "../../entities/amc-questionnaires/HealthSectorOption";
import { FutureData } from "../../entities/Future";
import { HealthSectorOptionsRepository } from "../../repositories/amc-questionnaires/HealthSectorOptionsRepository";

export class GetHealthSectorOptionsUseCase implements UseCase {
    constructor(private healthSectorOptionsRepository: HealthSectorOptionsRepository) {}

    public execute(): FutureData<HealthSectorOption[]> {
        return this.healthSectorOptionsRepository.get();
    }
}

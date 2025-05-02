import { UseCase } from "../../../CompositionRoot";
import { HealthLevelOption } from "../../entities/amc-questionnaires/HealthLevelOption";
import { FutureData } from "../../entities/Future";
import { HealthLevelOptionsRepository } from "../../repositories/amc-questionnaires/HealthLevelOptionsRepository";

export class GetHealthLevelOptionsUseCase implements UseCase {
    constructor(private healthLevelOptionsRepository: HealthLevelOptionsRepository) {}

    public execute(): FutureData<HealthLevelOption[]> {
        return this.healthLevelOptionsRepository.get();
    }
}

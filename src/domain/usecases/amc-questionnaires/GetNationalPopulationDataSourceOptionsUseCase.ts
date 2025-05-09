import { UseCase } from "../../../CompositionRoot";
import { NationalPopulationDataSourceOption } from "../../entities/amc-questionnaires/NationalPopulationDataSourceOption";
import { FutureData } from "../../entities/Future";
import { NationalPopulationDataSourceOptionsRepository } from "../../repositories/amc-questionnaires/NationalPopulationDataSourceOptionsRepository";

export class GetNationalPopulationDataSourceOptionsUseCase implements UseCase {
    constructor(private nationalPopulationDataSourceOptionsRepository: NationalPopulationDataSourceOptionsRepository) {}

    public execute(): FutureData<NationalPopulationDataSourceOption[]> {
        return this.nationalPopulationDataSourceOptionsRepository.get();
    }
}

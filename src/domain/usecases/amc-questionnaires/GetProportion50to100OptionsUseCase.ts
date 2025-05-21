import { UseCase } from "../../../CompositionRoot";
import { Proportion50to100Option } from "../../entities/amc-questionnaires/Proportion50to100Option";
import { FutureData } from "../../entities/Future";
import { Proportion50to100OptionsRepository } from "../../repositories/amc-questionnaires/Proportion50to100OptionsRepository";

export class GetProportion50to100OptionsUseCase implements UseCase {
    constructor(private proportion50to100OptionsRepository: Proportion50to100OptionsRepository) {}

    public execute(): FutureData<Proportion50to100Option[]> {
        return this.proportion50to100OptionsRepository.get();
    }
}

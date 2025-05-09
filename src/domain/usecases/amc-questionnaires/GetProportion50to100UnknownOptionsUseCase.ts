import { UseCase } from "../../../CompositionRoot";
import { Proportion50to100UnknownOption } from "../../entities/amc-questionnaires/Proportion50to100UnknownOption";
import { FutureData } from "../../entities/Future";
import { Proportion50to100UnknownOptionsRepository } from "../../repositories/amc-questionnaires/Proportion50to100UnknownOptionsRepository";

export class GetProportion50to100UnknownOptionsUseCase implements UseCase {
    constructor(private proportion50to100UnknownOptionsRepository: Proportion50to100UnknownOptionsRepository) {}

    public execute(): FutureData<Proportion50to100UnknownOption[]> {
        return this.proportion50to100UnknownOptionsRepository.get();
    }
}

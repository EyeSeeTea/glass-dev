import { UseCase } from "../../../CompositionRoot";
import { StrataOption } from "../../entities/amc-questionnaires/StrataOption";
import { FutureData } from "../../entities/Future";
import { StrataOptionsRepository } from "../../repositories/amc-questionnaires/StrataOptionsRepository";

export class GetStrataOptionsUseCase implements UseCase {
    constructor(private strataOptionsRepository: StrataOptionsRepository) {}

    public execute(): FutureData<StrataOption[]> {
        return this.strataOptionsRepository.get();
    }
}

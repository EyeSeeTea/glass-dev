import { UseCase } from "../../../CompositionRoot";
import { YesNoOption } from "../../entities/amc-questionnaires/YesNoOption";
import { FutureData } from "../../entities/Future";
import { YesNoOptionsRepository } from "../../repositories/amc-questionnaires/YesNoOptionsRepository";

export class GetYesNoOptionsUseCase implements UseCase {
    constructor(private yesNoOptionsRepository: YesNoOptionsRepository) {}

    public execute(): FutureData<YesNoOption[]> {
        return this.yesNoOptionsRepository.get();
    }
}

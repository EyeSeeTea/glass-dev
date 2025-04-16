import { UseCase } from "../../../CompositionRoot";
import { YesNoUnknownOption } from "../../entities/amc-questionnaires/YesNoUnknownOption";
import { FutureData } from "../../entities/Future";
import { YesNoUnknownOptionsRepository } from "../../repositories/amc-questionnaires/YesNoUnknownOptionsRepository";

export class GetYesNoUnknownOptionsUseCase implements UseCase {
    constructor(private yesNoUnknownOptionsRepository: YesNoUnknownOptionsRepository) {}

    public execute(): FutureData<YesNoUnknownOption[]> {
        return this.yesNoUnknownOptionsRepository.get();
    }
}

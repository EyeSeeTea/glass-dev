import { UseCase } from "../../../CompositionRoot";
import { YesNoUnknownNAOption } from "../../entities/amc-questionnaires/YesNoUnknownNAOption";
import { FutureData } from "../../entities/Future";
import { YesNoUnknownNAOptionsRepository } from "../../repositories/amc-questionnaires/YesNoUnknownNAOptionsRepository";

export class GetYesNoUnknownNAOptionsUseCase implements UseCase {
    constructor(private yesNoUnknownNAOptionsRepository: YesNoUnknownNAOptionsRepository) {}

    public execute(): FutureData<YesNoUnknownNAOption[]> {
        return this.yesNoUnknownNAOptionsRepository.get();
    }
}

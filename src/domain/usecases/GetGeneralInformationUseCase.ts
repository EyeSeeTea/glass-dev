import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GeneralRepository } from "../repositories/GeneralRepository";

export class GetGeneralInformationUseCase implements UseCase {
    constructor(private generalRepository: GeneralRepository) {}

    public execute(): FutureData<unknown> {
        return this.generalRepository.get();
    }
}

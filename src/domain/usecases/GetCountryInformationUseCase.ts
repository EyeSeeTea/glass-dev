import { UseCase } from "../../CompositionRoot";
import { CountryInformation } from "../entities/CountryInformation";
import { FutureData } from "../entities/Future";
import { CountryInformationRepository } from "../repositories/CountryInformationRepository";

export class GetCountryInformationUseCase implements UseCase {
    constructor(private countryInformationRepository: CountryInformationRepository) {}

    public execute(countryId: string, module: string): FutureData<CountryInformation> {
        return this.countryInformationRepository.get(countryId, module);
    }
}

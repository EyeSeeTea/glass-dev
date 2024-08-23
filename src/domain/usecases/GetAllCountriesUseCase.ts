import { UseCase } from "../../CompositionRoot";
import { Country } from "../entities/Country";
import { FutureData } from "../entities/Future";
import { CountryRepository } from "../repositories/CountryRepository";

export class GetAllCountriesUseCase implements UseCase {
    constructor(private countryRepository: CountryRepository) {}

    public execute(): FutureData<Country[]> {
        return this.countryRepository.getAll();
    }
}

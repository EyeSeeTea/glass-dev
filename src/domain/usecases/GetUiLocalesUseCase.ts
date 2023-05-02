import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { LocalesRepository } from "../repositories/LocalesRepository";
import { LocalesType } from "./GetDatabaseLocalesUseCase";

export class GetUiLocalesUseCase implements UseCase {
    constructor(private localesRepository: LocalesRepository) {}

    public execute(): FutureData<LocalesType> {
        return this.localesRepository.getDatabaseLocales();
    }
}

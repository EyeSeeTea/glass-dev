import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { LocalesRepository } from "../repositories/LocalesRepository";

export type LocalesType = {
    locale: string;
    name: string;
}[];

export class GetDatabaseLocalesUseCase implements UseCase {
    constructor(private localesRepository: LocalesRepository) {}

    public execute(): FutureData<LocalesType> {
        return this.localesRepository.getDatabaseLocales();
    }
}

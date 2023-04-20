import { FutureData } from "../entities/Future";
import { LocalesType } from "../usecases/GetDatabaseLocalesUseCase";

export interface LocalesRepository {
    getDatabaseLocales(): FutureData<LocalesType>;
    getUiLocales(): FutureData<LocalesType>;
}

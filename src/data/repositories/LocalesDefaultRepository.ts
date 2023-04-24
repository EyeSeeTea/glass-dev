import { D2Api } from "@eyeseetea/d2-api/2.34";
import { FutureData } from "../../domain/entities/Future";
import { cache } from "../../utils/cache";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { Instance } from "../entities/Instance";
import { LocalesType } from "../../domain/usecases/GetDatabaseLocalesUseCase";
import { LocalesRepository } from "../../domain/repositories/LocalesRepository";
import { apiToFuture } from "../../utils/futures";

type DatabaseLocaleType = {
    name: string;
    locale: string;
    [rest: string]: string;
}[];

export class LocalesDefaultRepository implements LocalesRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    @cache()
    getUiLocales(): FutureData<LocalesType> {
        return apiToFuture(
            this.api.get<LocalesType>("locales/ui").map(locales => {
                return locales.data;
            })
        );
    }

    getDatabaseLocales(): FutureData<LocalesType> {
        return apiToFuture(
            this.api.get<DatabaseLocaleType>("/locales/dbLocales").map(locales => {
                return locales.data.map(locale => {
                    return { locale: locale.locale, name: locale.name };
                });
            })
        );
    }
}

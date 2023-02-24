import { CountryInformation } from "../entities/CountryInformation";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";

export interface CountryInformationRepository {
    get(countryId: Id, module: string): FutureData<CountryInformation>;
}

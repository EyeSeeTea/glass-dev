import { FutureData } from "../entities/Future";
import { Ref } from "../entities/Ref";

export interface UsersRepository {
    getAllFilteredbyOUsAndUserGroups(orgUnitId: string, userGroups: string[]): FutureData<Ref[]>;
    savePassword(password: string): FutureData<void | unknown>;
    saveLocale(isUiLocale: boolean, locale: string): FutureData<void | unknown>;
}

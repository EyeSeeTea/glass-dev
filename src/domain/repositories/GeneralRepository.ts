import { FutureData } from "../entities/Future";

export interface GeneralRepository {
    get(): FutureData<unknown>;
}

import { D2Api } from "@eyeseetea/d2-api/2.34";
import { FutureData } from "../../domain/entities/Future";
import { cache } from "../../utils/cache";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";
import { Instance } from "../entities/Instance";
import { GeneralRepository } from "../../domain/repositories/GeneralRepository";

export class GeneralDefaultRepository implements GeneralRepository {
    private api: D2Api;

    constructor(private dataStoreClient: DataStoreClient, instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    @cache()
    get(): FutureData<unknown> {
        return this.dataStoreClient.getObject(DataStoreKeys.GENERAL);
    }
}

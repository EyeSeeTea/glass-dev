import { FutureData } from "../../domain/entities/Future";
import { D2Api, DataStore } from "../../types/d2-api";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { Instance } from "../entities/Instance";

export const dataStoreNamespace = "bulk-load";

export class BulkLoadDataStoreClient {
    private api: D2Api;
    private dataStore: DataStore;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
        this.dataStore = this.api.dataStore(dataStoreNamespace);
    }
    public getObject<T extends object>(key: string): FutureData<T | undefined> {
        return apiToFuture(this.dataStore.get<T>(key));
    }
}

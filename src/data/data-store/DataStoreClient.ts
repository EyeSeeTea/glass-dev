import { Future, FutureData } from "../../domain/entities/Future";
import { D2Api, DataStore } from "../../types/d2-api";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { Instance } from "../entities/Instance";

export const dataStoreNamespace = "glass";

export class DataStoreClient {
    private api: D2Api;
    private dataStore: DataStore;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
        this.dataStore = this.api.dataStore(dataStoreNamespace);
    }

    public getObjectCollectionByProp<T>(key: string, prop: keyof T, value: unknown): FutureData<T> {
        return Future.fromComputation((resolve, reject) => {
            const res = this.dataStore.get<T[]>(key);

            res.getData()
                .then(list => {
                    const object = (list || []).find(item => item[prop] === value);

                    if (object) {
                        resolve(object);
                    } else {
                        reject(`Object with prop ${String(prop)}=${value} not found`);
                    }
                })
                .catch(err => reject(err ? err.message : "Unknown key"));
            return res.cancel;
        });
    }

    public listCollection<T>(key: string): FutureData<T[]> {
        return apiToFuture(this.dataStore.get<T[]>(key)).map(data => data ?? []);
    }

    public getObject<T extends object>(key: string): FutureData<T | undefined> {
        return apiToFuture(this.dataStore.get<T>(key));
    }

    public saveObject<T extends object>(key: string, value: T): FutureData<void> {
        return apiToFuture(this.dataStore.save(key, value));
    }
}

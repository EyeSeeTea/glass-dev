import { Future, FutureData } from "../../domain/entities/Future";
import { D2Api, DataStore } from "../../types/d2-api";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { Instance } from "../entities/Instance";

export const dataStoreNamespace = "glass";

export class DataStoreClient {
    private api: D2Api;
    private dataStore: DataStore;

    constructor(instance?: Instance, api?: D2Api) {
        if (api) {
            // Use the provided api instance
            this.api = api;
        } else if (instance) {
            // Fallback to instance if no api is provided
            this.api = getD2APiFromInstance(instance);
        } else {
            throw new Error("Either 'api' or 'instance' must be provided.");
        }
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

    public getObjectsFilteredByProps<T>(key: string, filterMap: Map<keyof T, unknown>): FutureData<T[]> {
        return Future.fromComputation((resolve, reject) => {
            const res = this.dataStore.get<T[]>(key);

            res.getData()
                .then(list => {
                    let filteredList = list;

                    filterMap.forEach((value, key) => {
                        filteredList = filteredList?.filter(i => i[key] === value);
                    });

                    if (filteredList) {
                        resolve(filteredList);
                    } else {
                        reject(`Collection with specified filters not found`);
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

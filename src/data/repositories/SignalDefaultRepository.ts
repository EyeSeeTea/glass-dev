import { FutureData } from "../../domain/entities/Future";
import { Signal } from "../../domain/entities/Signal";
import { SignalRepository } from "../../domain/repositories/SignalRepository";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";

export class SignalDefaultRepository implements SignalRepository {
    constructor(private dataStoreClient: DataStoreClient) {}

    getAll(): FutureData<Signal[]> {
        return this.dataStoreClient.listCollection<Signal>(DataStoreKeys.SIGNALS);
    }

    save(signal: Signal): FutureData<void> {
        return this.dataStoreClient.listCollection(DataStoreKeys.SIGNALS).flatMap(signals => {
            const newSignalList = [...signals, signal];
            console.debug(newSignalList);
            return this.dataStoreClient.saveObject(DataStoreKeys.SIGNALS, newSignalList);
        });
    }
}

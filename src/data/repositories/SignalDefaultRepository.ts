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
        return this.dataStoreClient.listCollection<Signal>(DataStoreKeys.SIGNALS).flatMap((signals: Signal[]) => {
            const existingSignalId = signals.findIndex(s => s.id === signal.id);
            //If signal with same id already exists, update it.
            if (existingSignalId !== -1) {
                signals[existingSignalId] = signal;
                return this.dataStoreClient.saveObject(DataStoreKeys.SIGNALS, signals);
            }
            //Else add a new signal.
            else {
                const newSignalList = [...signals, signal];
                return this.dataStoreClient.saveObject(DataStoreKeys.SIGNALS, newSignalList);
            }
        });
    }
}

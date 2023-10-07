import { Id } from "@eyeseetea/d2-api";
import { Future, FutureData } from "../../domain/entities/Future";
import { Signal } from "../../domain/entities/Signal";
import { SignalRepository } from "../../domain/repositories/SignalRepository";
import { D2Api } from "../../types/d2-api";
import { apiToFuture } from "../../utils/futures";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";

export class SignalDefaultRepository implements SignalRepository {
    constructor(private dataStoreClient: DataStoreClient, private api: D2Api) {}

    getAll(currentOrgUnitId: Id): FutureData<Signal[]> {
        return this.dataStoreClient.listCollection<Signal>(DataStoreKeys.SIGNALS).flatMap((signals: Signal[]) => {
            return this.hasDeletePermission(signals, currentOrgUnitId);
        });
    }

    getById(id: Id): FutureData<Signal> {
        return this.dataStoreClient.getObjectCollectionByProp<Signal>(DataStoreKeys.SIGNALS, "id", id);
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

    delete(signalId: string): FutureData<void> {
        return this.dataStoreClient.listCollection<Signal>(DataStoreKeys.SIGNALS).flatMap((signals: Signal[]) => {
            const signal = signals.find(s => s.id === signalId);
            //If signal with same id already exists, update it.
            if (signal) {
                signals.splice(signals.indexOf(signal), 1);
                return this.dataStoreClient.saveObject(DataStoreKeys.SIGNALS, signals);
            } else {
                return Future.error("Signal could not be found");
            }
        });
    }

    private hasDeletePermission(signals: Signal[], currentOrgUnitId: string): FutureData<Signal[]> {
        return apiToFuture(
            this.api.models.organisationUnits.get({
                fields: {
                    id: true,
                    level: true,
                },
            })
        ).map(({ objects }) => {
            const filteredOrgUnits = objects.filter(orgUnit =>
                [...signals.map(signal => signal.orgUnit.id), currentOrgUnitId].includes(orgUnit.id)
            );
            const extendedSignals: Signal[] = [];
            const currentOrgUnit = filteredOrgUnits.find(orgUnit => orgUnit.id === currentOrgUnitId);
            signals.forEach(signal => {
                const signalOrgUnitLevel = filteredOrgUnits.find(orgUnit => orgUnit.id === signal?.orgUnit.id)?.level;
                if (
                    signal.orgUnit.id === currentOrgUnitId ||
                    (signalOrgUnitLevel && currentOrgUnit && signalOrgUnitLevel > currentOrgUnit?.level)
                ) {
                    extendedSignals.push({ ...signal, userHasDeletePermission: true });
                } else {
                    extendedSignals.push({ ...signal, userHasDeletePermission: false });
                }
            });

            return extendedSignals;
        });
    }
}

import { Id } from "@eyeseetea/d2-api";
import { FutureData } from "../entities/Future";
import { Signal } from "../entities/Signal";

export interface SignalRepository {
    getAll(currentOrgUnitId: Id): FutureData<Signal[]>;
    getById(id: Id): FutureData<Signal>;
    save(signal: Signal): FutureData<void>;
}

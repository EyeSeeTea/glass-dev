import { FutureData } from "../entities/Future";
import { Signal } from "../entities/Signal";

export interface SignalRepository {
    getAll(): FutureData<Signal[]>;
    save(signal: Signal): FutureData<void>;
}

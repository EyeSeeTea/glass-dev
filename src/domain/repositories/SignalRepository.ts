import { FutureData } from "../entities/Future";
import { Signal } from "../entities/Signal";

export interface SignalRepository {
    save(signal: Signal): FutureData<void>;
}

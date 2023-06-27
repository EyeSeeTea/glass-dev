import { TrackedEntity } from "../../data/repositories/TrackerDefaultRepository";
import { FutureData } from "../entities/Future";

export interface TrackerRepository {
    import(entities: TrackedEntity[]): FutureData<void>;
}

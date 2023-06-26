import { FutureData } from "../entities/Future";
import { RISIndividualData } from "../entities/data-entry/amr-i-external/RISIndividualData";

export interface TrackerRepository {
    import(events: RISIndividualData[]): FutureData<void>;
}

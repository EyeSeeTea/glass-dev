import { UNPopulation } from "../../entities/amc-questionnaires/UNPopulation";
import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";

export interface UNPopulationRepository {
    get(orgUnitId: Id, period: string): FutureData<UNPopulation>;
}

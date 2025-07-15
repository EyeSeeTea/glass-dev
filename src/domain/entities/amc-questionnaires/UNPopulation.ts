import { Maybe } from "../../../types/utils";
import { Struct } from "../generic/Struct";
import { Id } from "../Ref";

type UNPopulationAttrs = {
    orgUnitId: Id;
    period: string;
    population: Maybe<number>;
};

export class UNPopulation extends Struct<UNPopulationAttrs>() {
    constructor(_attributes: UNPopulationAttrs) {
        super(_attributes);
        if (!this.validate()) {
            throw new Error("UNPopulation must reference an orgUnitId and a period.");
        }
    }

    validate(): boolean {
        if (!this.orgUnitId || !this.period) {
            return false;
        }
        return true;
    }
}

import { UNPopulation } from "../../../domain/entities/amc-questionnaires/UNPopulation";
import { FutureData } from "../../../domain/entities/Future";
import { UNPopulationRepository } from "../../../domain/repositories/amc-questionnaires/UNPopulationRepository";
import { D2Api } from "../../../types/d2-api";
import { apiToFuture } from "../../../utils/futures";

export class UNPopulationD2Repository implements UNPopulationRepository {
    constructor(private api: D2Api) {}

    private dataSetId = "LaD0zShIosR"; // UN Population dataset ID
    private dataElementId = "fGK3m7lbouY"; // Population UN dataElement ID

    get(orgUnitId: string, period: string): FutureData<UNPopulation> {
        return apiToFuture(
            this.api.dataValues.getSet({
                dataSet: [this.dataSetId],
                orgUnit: [orgUnitId],
                period: [period],
            })
        ).map(response => {
            if (response.dataValues.length === 0) {
                return new UNPopulation({
                    orgUnitId: orgUnitId,
                    period: period,
                    population: undefined,
                });
            }
            const value = response.dataValues.find(dataValue => dataValue.dataElement === this.dataElementId)?.value;
            return new UNPopulation({
                orgUnitId: orgUnitId,
                period: period,
                population: value ? parseFloat(value) : undefined,
            });
        });
    }
}

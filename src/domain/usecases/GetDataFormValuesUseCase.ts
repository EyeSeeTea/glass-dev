import { Id } from "@eyeseetea/d2-api";
import { DataValueStore, Period } from "../entities/DataValue";
import { DataValueRepository } from "../repositories/DataValueRepository";

export class GetDataFormValuesUseCase {
    constructor(private dataValueRepository: DataValueRepository) {}

    async execute(dataSetId: Id, options: { orgUnitId: Id; period: Period }): Promise<DataValueStore> {
        const dataValues = await this.dataValueRepository.get({ dataSetId: dataSetId, ...options });
        return DataValueStore.from(dataValues);
    }
}

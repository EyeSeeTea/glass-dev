import { UseCase } from "../../../CompositionRoot";
import { DataLevelOption } from "../../entities/amc-questionnaires/DataLevelOption";
import { FutureData } from "../../entities/Future";
import { DataLevelOptionsRepository } from "../../repositories/amc-questionnaires/DataLevelOptionsRepository";

export class GetDataLevelOptionsUseCase implements UseCase {
    constructor(private dataLevelOptionsRepository: DataLevelOptionsRepository) {}

    public execute(): FutureData<DataLevelOption[]> {
        return this.dataLevelOptionsRepository.get();
    }
}

import { UseCase } from "../../../CompositionRoot";
import { DataSourceOption } from "../../entities/amc-questionnaires/DataSourceOption";
import { FutureData } from "../../entities/Future";
import { DataSourceOptionsRepository } from "../../repositories/amc-questionnaires/DataSourceOptionsRepository";

export class GetDataSourceOptionsUseCase implements UseCase {
    constructor(private dataSourceOptionsRepository: DataSourceOptionsRepository) {}

    public execute(): FutureData<DataSourceOption[]> {
        return this.dataSourceOptionsRepository.get();
    }
}

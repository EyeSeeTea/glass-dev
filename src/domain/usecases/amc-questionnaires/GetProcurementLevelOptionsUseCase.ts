import { UseCase } from "../../../CompositionRoot";
import { ProcurementLevelOption } from "../../entities/amc-questionnaires/ProcurementLevelOption";
import { FutureData } from "../../entities/Future";
import { ProcurementLevelOptionsRepository } from "../../repositories/amc-questionnaires/ProcurementLevelOptionsRepository";

export class GetProcurementLevelOptionsUseCase implements UseCase {
    constructor(private procurementLevelOptionsRepository: ProcurementLevelOptionsRepository) {}

    public execute(): FutureData<ProcurementLevelOption[]> {
        return this.procurementLevelOptionsRepository.get();
    }
}

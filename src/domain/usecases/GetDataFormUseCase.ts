import { Id } from "@eyeseetea/d2-api";
import { DataFormRepository } from "../repositories/DataFormRepository";

export class GetDataFormUseCase {
    constructor(private dataFormRepository: DataFormRepository) {}

    execute(dataSetId: Id) {
        return this.dataFormRepository.get({ id: dataSetId });
    }
}

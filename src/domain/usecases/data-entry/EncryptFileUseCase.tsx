import { UseCase } from "../../../CompositionRoot";
import { FutureData } from "../../entities/Future";
import { EGASPDataRepository } from "../../repositories/data-entry/EGASPDataRepository";

export class EncryptFileUseCase implements UseCase {
    constructor(private egaspDataRepository: EGASPDataRepository) {}

    public execute(inputFile: File, rowCount: number): FutureData<File> {
        //Only EGASP has encryption
        return this.egaspDataRepository.encrypt(inputFile, rowCount);
    }
}

import { UseCase } from "../../../CompositionRoot";
import { FutureData } from "../../entities/Future";
import { RISDataRepository } from "../../repositories/data-entry/RISDataRepository";

export class ValidateRISFileUseCase implements UseCase {
    constructor(private risDataRepository: RISDataRepository) {}

    public execute(inputFile: File): FutureData<{ isValid: boolean; records: number; specimens: string[] }> {
        return this.risDataRepository.validate(inputFile);
    }
}

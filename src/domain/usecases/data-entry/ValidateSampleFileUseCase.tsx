import { UseCase } from "../../../CompositionRoot";
import { FutureData } from "../../entities/Future";
import { SampleDataRepository } from "../../repositories/data-entry/SampleDataRepository";

export class ValidateSampleFileUseCase implements UseCase {
    constructor(private sampleDataRepository: SampleDataRepository) {}

    public execute(inputFile: File): FutureData<{ isValid: boolean; records: number }> {
        return this.sampleDataRepository.validate(inputFile);
    }
}

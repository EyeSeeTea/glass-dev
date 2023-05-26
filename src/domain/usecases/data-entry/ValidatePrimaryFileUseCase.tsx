import { UseCase } from "../../../CompositionRoot";
import { FutureData, Future } from "../../entities/Future";
import { EGASPDataRepository } from "../../repositories/data-entry/EGASPDataRepository";
import { RISDataRepository } from "../../repositories/data-entry/RISDataRepository";

export class ValidatePrimaryFileUseCase implements UseCase {
    constructor(private risDataRepository: RISDataRepository, private egaspDataRepository: EGASPDataRepository) {}

    public execute(
        inputFile: File,
        moduleName: string
    ): FutureData<{ isValid: boolean; records: number; specimens: string[] }> {
        if (moduleName === "AMR") {
            return this.risDataRepository.validate(inputFile);
        } else if (moduleName === "EGASP") {
            return this.egaspDataRepository.validate(inputFile);
        } else {
            return Future.error("Unkonwm module type");
        }
    }
}

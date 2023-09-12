import { UseCase } from "../../../CompositionRoot";
import { GlassModuleDefaultRepository } from "../../../data/repositories/GlassModuleDefaultRepository";
import { FutureData, Future } from "../../entities/Future";
import { EGASPDataRepository } from "../../repositories/data-entry/EGASPDataRepository";
import { RISDataRepository } from "../../repositories/data-entry/RISDataRepository";
import { RISIndividualDataRepository } from "../../repositories/data-entry/RISIndividualDataRepository";

export class ValidatePrimaryFileUseCase implements UseCase {
    constructor(
        private risDataRepository: RISDataRepository,
        private risIndividualRepository: RISIndividualDataRepository,
        private egaspDataRepository: EGASPDataRepository,
        private glassModuleDefaultRepository: GlassModuleDefaultRepository
    ) {}

    public execute(
        inputFile: File,
        moduleName: string
    ): FutureData<{ isValid: boolean; records: number; specimens: string[] }> {
        switch (moduleName) {
            case "AMR": {
                return this.risDataRepository.validate(inputFile);
            }

            case "EGASP": {
                return this.glassModuleDefaultRepository.getByName(moduleName).flatMap(module => {
                    return this.egaspDataRepository.validate(inputFile, module.dataColumns);
                });
            }
            case "AMR - Individual": {
                return this.risIndividualRepository.validate(inputFile);
            }

            default: {
                return Future.error("Unkonwm module type");
            }
        }
    }
}

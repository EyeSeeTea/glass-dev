import { UseCase } from "../../../CompositionRoot";
import { GlassModuleDefaultRepository } from "../../../data/repositories/GlassModuleDefaultRepository";
import { FutureData, Future } from "../../entities/Future";
import { AMCProductDataRepository } from "../../repositories/data-entry/AMCProductDataRepository";
import { EGASPDataRepository } from "../../repositories/data-entry/EGASPDataRepository";
import { RISDataRepository } from "../../repositories/data-entry/RISDataRepository";
import { RISIndividualFungalDataRepository } from "../../repositories/data-entry/RISIndividualFungalDataRepository";

export class ValidatePrimaryFileUseCase implements UseCase {
    constructor(
        private risDataRepository: RISDataRepository,
        private risIndividualFungalRepository: RISIndividualFungalDataRepository,
        private egaspDataRepository: EGASPDataRepository,
        private glassModuleDefaultRepository: GlassModuleDefaultRepository,
        private amcProductDataRepository: AMCProductDataRepository
    ) {}

    public execute(
        inputFile: File,
        moduleName: string
    ): FutureData<{ isValid: boolean; rows: number; specimens: string[] }> {
        switch (moduleName) {
            case "AMR": {
                return this.risDataRepository.validate(inputFile);
            }

            case "EGASP": {
                return this.glassModuleDefaultRepository.getByName(moduleName).flatMap(module => {
                    return this.egaspDataRepository.validate(inputFile, module.dataColumns);
                });
            }
            case "AMR - Individual":
            case "AMR - Fungal": {
                return this.glassModuleDefaultRepository.getByName(moduleName).flatMap(module => {
                    const customDataColumns = module.customDataColumns ? module.customDataColumns : [];
                    return this.risIndividualFungalRepository.validate(customDataColumns, inputFile);
                });
            }
            case "AMC":
                return this.glassModuleDefaultRepository.getByName(moduleName).flatMap(module => {
                    if (module.teiColumns)
                        return this.amcProductDataRepository.validate(inputFile, module.dataColumns, module.teiColumns);
                    else return Future.error("An error occured in file validation");
                });

            default: {
                return Future.error("Unkonwm module type");
            }
        }
    }
}

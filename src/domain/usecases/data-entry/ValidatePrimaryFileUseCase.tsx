import { UseCase } from "../../../CompositionRoot";
import { GlassModuleDefaultRepository } from "../../../data/repositories/GlassModuleDefaultRepository";
import { FutureData, Future } from "../../entities/Future";
import { AMCDataRepository } from "../../repositories/data-entry/AMCDataRepository";
import { EGASPDataRepository } from "../../repositories/data-entry/EGASPDataRepository";
import { RISDataRepository } from "../../repositories/data-entry/RISDataRepository";
import { RISIndividualFunghiDataRepository } from "../../repositories/data-entry/RISIndividualFunghiDataRepository";

export class ValidatePrimaryFileUseCase implements UseCase {
    constructor(
        private risDataRepository: RISDataRepository,
        private risIndividualFunghiRepository: RISIndividualFunghiDataRepository,
        private egaspDataRepository: EGASPDataRepository,
        private glassModuleDefaultRepository: GlassModuleDefaultRepository,
        private amcDataRepository: AMCDataRepository
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
            case "AMR - Funghi": {
                return this.glassModuleDefaultRepository.getByName(moduleName).flatMap(module => {
                    const customDataColumns = module.customDataColumns ? module.customDataColumns : [];
                    return this.risIndividualFunghiRepository.validate(customDataColumns, inputFile);
                });
            }
            case "AMC":
                return this.glassModuleDefaultRepository.getByName(moduleName).flatMap(module => {
                    if (module.teiColumns)
                        return this.amcDataRepository.validate(inputFile, module.dataColumns, module.teiColumns);
                    else return Future.error("An error occured in file validation");
                });

            default: {
                return Future.error("Unkonwm module type");
            }
        }
    }
}

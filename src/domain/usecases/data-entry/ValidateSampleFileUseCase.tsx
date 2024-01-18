import { UseCase } from "../../../CompositionRoot";
import { AMCSubstanceDataRepository } from "../../repositories/data-entry/AMCSubstanceDataRepository";
import { GlassModuleDefaultRepository } from "../../../data/repositories/GlassModuleDefaultRepository";
import { Future, FutureData } from "../../entities/Future";
import { SampleDataRepository } from "../../repositories/data-entry/SampleDataRepository";

export class ValidateSampleFileUseCase implements UseCase {
    constructor(
        private sampleDataRepository: SampleDataRepository,
        private amcSubstanceDataReporsitory: AMCSubstanceDataRepository,
        private glassModuleDefaultRepository: GlassModuleDefaultRepository
    ) {}

    public execute(inputFile: File, moduleName: string): FutureData<{ isValid: boolean; rows: number }> {
        switch (moduleName) {
            case "AMR":
                return this.sampleDataRepository.validate(inputFile);
            case "AMC":
                return this.glassModuleDefaultRepository.getByName(moduleName).flatMap(module => {
                    if (module.rawSubstanceDataColumns)
                        return this.amcSubstanceDataReporsitory.validate(inputFile, module.rawSubstanceDataColumns);
                    else return Future.error("Error fetching raw substance data columns");
                });
            default:
                return Future.error("Unkown module type");
        }
    }
}

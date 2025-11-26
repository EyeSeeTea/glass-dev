import { UseCase } from "../../../CompositionRoot";
import { AMCSubstanceDataRepository } from "../../repositories/data-entry/AMCSubstanceDataRepository";
import { GlassModuleDefaultRepository } from "../../../data/repositories/GlassModuleDefaultRepository";
import { Future, FutureData } from "../../entities/Future";
import { SampleDataRepository } from "../../repositories/data-entry/SampleDataRepository";
import { FileValidationResult, ValidationResult } from "../../entities/FileValidationResult";
import { GeneralInfoRepository } from "../../repositories/GeneralInfoRepository";
import { isSizeGreaterThan } from "../../../utils/files";
import { DEFAULT_FILE_SIZE_LIMIT_MB } from "../../entities/GlassGeneralInfo";

export class ValidateSampleFileUseCase implements UseCase {
    constructor(
        private sampleDataRepository: SampleDataRepository,
        private amcSubstanceDataReporsitory: AMCSubstanceDataRepository,
        private glassModuleDefaultRepository: GlassModuleDefaultRepository,
        private generalInfoRepository: GeneralInfoRepository
    ) {}

    public execute(inputFile: File, moduleName: string): FutureData<FileValidationResult<ValidationResult>> {
        return this.needsPreprocessing(inputFile).flatMap(
            (needsPreprocessing): FutureData<FileValidationResult<ValidationResult>> => {
                if (needsPreprocessing) {
                    return Future.success({
                        status: "needsPreprocessing",
                    });
                } else {
                    return this.validate(inputFile, moduleName).map(result => ({
                        ...result,
                        status: "validated",
                    }));
                }
            }
        );
    }

    private needsPreprocessing(file: File): FutureData<boolean> {
        return this.generalInfoRepository.get().map(info => {
            const maxSizeMB = info.fileSizeLimit || DEFAULT_FILE_SIZE_LIMIT_MB;
            return isSizeGreaterThan(file, maxSizeMB);
        });
    }

    private validate(inputFile: File, moduleName: string): FutureData<ValidationResult> {
        switch (moduleName) {
            case "AMR":
            case "AMR - Individual":
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

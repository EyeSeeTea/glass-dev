import { UseCase } from "../../../CompositionRoot";
import { GlassModuleDefaultRepository } from "../../../data/repositories/GlassModuleDefaultRepository";
import { isCsvFile } from "../../../data/repositories/utils/CSVUtils";
import { isSizeGreaterThan } from "../../../utils/files";
import { FileValidationResult, ValidationResultWithSpecimens } from "../../entities/FileValidationResult";
import { FutureData, Future } from "../../entities/Future";
import { DEFAULT_FILE_SIZE_LIMIT_MB } from "../../entities/GlassGeneralInfo";
import { AMCDataRepository } from "../../repositories/data-entry/AMCDataRepository";
import { EGASPDataRepository } from "../../repositories/data-entry/EGASPDataRepository";
import { RISDataRepository } from "../../repositories/data-entry/RISDataRepository";
import { RISIndividualFungalDataRepository } from "../../repositories/data-entry/RISIndividualFungalDataRepository";
import { GeneralInfoRepository } from "../../repositories/GeneralInfoRepository";

export class ValidatePrimaryFileUseCase implements UseCase {
    constructor(
        private risDataRepository: RISDataRepository,
        private risIndividualFungalRepository: RISIndividualFungalDataRepository,
        private egaspDataRepository: EGASPDataRepository,
        private glassModuleDefaultRepository: GlassModuleDefaultRepository,
        private amcDataRepository: AMCDataRepository,
        private generalInfoRepository: GeneralInfoRepository
    ) {}

    public execute(inputFile: File, moduleName: string): FutureData<FileValidationResult> {
        return this.needsPreprocessing(inputFile).flatMap((needsPreprocessing): FutureData<FileValidationResult> => {
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
        });
    }

    private needsPreprocessing(file: File): FutureData<boolean> {
        if (isCsvFile(file)) {
            return Future.success(false);
        }
        return this.generalInfoRepository.get().map(info => {
            const maxSizeMB = info.fileSizeLimit || DEFAULT_FILE_SIZE_LIMIT_MB;
            return isSizeGreaterThan(file, maxSizeMB);
        });
    }

    private validate(inputFile: File, moduleName: string): FutureData<ValidationResultWithSpecimens> {
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
                        return this.amcDataRepository.validate(inputFile, module.dataColumns, module.teiColumns);
                    else return Future.error("An error occured in file validation");
                });

            default: {
                return Future.error("Unkonwm module type");
            }
        }
    }
}

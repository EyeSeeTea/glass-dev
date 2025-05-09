import { Future, FutureData } from "../../entities/Future";
import { MetadataRepository } from "../../repositories/MetadataRepository";
import { DataValuesRepository } from "../../repositories/data-entry/DataValuesRepository";
import { RISDataRepository } from "../../repositories/data-entry/RISDataRepository";
import { ImportSummary } from "../../entities/data-entry/ImportSummary";
import { GlassModuleRepository } from "../../repositories/GlassModuleRepository";
import { ImportStrategy } from "../../entities/data-entry/DataValuesSaveSummary";
import { ImportRISFile } from "./amr/ImportRISFile";
import { ImportEGASPFile } from "./egasp/ImportEGASPFile";
import { Dhis2EventsDefaultRepository } from "../../../data/repositories/Dhis2EventsDefaultRepository";
import { ExcelRepository } from "../../repositories/ExcelRepository";
import { GlassDocumentsRepository } from "../../repositories/GlassDocumentsRepository";
import { ProgramRulesMetadataRepository } from "../../repositories/program-rules/ProgramRulesMetadataRepository";
import { ImportRISIndividualFungalFile } from "./amr-individual-fungal/ImportRISIndividualFungalFile";
import { RISIndividualFungalDataRepository } from "../../repositories/data-entry/RISIndividualFungalDataRepository";
import { TrackerRepository } from "../../repositories/TrackerRepository";
import { ImportAMCProductLevelData } from "./amc/ImportAMCProductLevelData";
import { AMCProductDataRepository } from "../../repositories/data-entry/AMCProductDataRepository";
import { AMCSubstanceDataRepository } from "../../repositories/data-entry/AMCSubstanceDataRepository";
import { Country } from "../../entities/Country";
import { GlassUploadsRepository } from "../../repositories/GlassUploadsRepository";
import { InstanceRepository } from "../../repositories/InstanceRepository";
import { GlassATCRepository } from "../../repositories/GlassATCRepository";
import { EncryptionRepository } from "../../repositories/EncryptionRepository";

export class ImportPrimaryFileUseCase {
    constructor(
        private risDataRepository: RISDataRepository,
        private risIndividualFungalRepository: RISIndividualFungalDataRepository,
        private metadataRepository: MetadataRepository,
        private dataValuesRepository: DataValuesRepository,
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private excelRepository: ExcelRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository,
        private trackerRepository: TrackerRepository,
        private glassModuleRepository: GlassModuleRepository,
        private instanceRepository: InstanceRepository,
        private programRulesMetadataRepository: ProgramRulesMetadataRepository,
        private atcRepository: GlassATCRepository,
        private amcProductRepository: AMCProductDataRepository,
        private amcSubstanceDataRepository: AMCSubstanceDataRepository,
        private glassAtcRepository: GlassATCRepository,
        private encryptionRepository: EncryptionRepository
    ) {}

    public execute(
        moduleName: string,
        inputFile: File,
        batchId: string,
        period: string,
        action: ImportStrategy,
        orgUnitId: string,
        orgUnitName: string,
        countryCode: string,
        dryRun: boolean,
        eventListId: string | undefined,
        allCountries: Country[],
        calculatedEventListFileId?: string
    ): FutureData<ImportSummary> {
        switch (moduleName) {
            case "AMR": {
                const importRISFile = new ImportRISFile(
                    this.risDataRepository,
                    this.metadataRepository,
                    this.dataValuesRepository,
                    this.glassModuleRepository
                );
                return importRISFile.importRISFile(inputFile, batchId, period, action, orgUnitId, countryCode, dryRun);
            }

            case "EGASP": {
                const importEGASPFile = new ImportEGASPFile(
                    this.dhis2EventsDefaultRepository,
                    this.excelRepository,
                    this.glassDocumentsRepository,
                    this.glassUploadsRepository,
                    this.programRulesMetadataRepository,
                    this.metadataRepository,
                    this.instanceRepository,
                    this.glassAtcRepository,
                    this.encryptionRepository
                );

                return importEGASPFile.importEGASPFile(
                    inputFile,
                    action,
                    eventListId,
                    moduleName,
                    orgUnitId,
                    orgUnitName,
                    period
                );
            }

            case "AMR - Individual":
            case "AMR - Fungal": {
                const importRISIndividualFungalFile = new ImportRISIndividualFungalFile(
                    this.risIndividualFungalRepository,
                    this.trackerRepository,
                    this.glassDocumentsRepository,
                    this.glassUploadsRepository,
                    this.metadataRepository,
                    this.programRulesMetadataRepository,
                    this.glassModuleRepository
                );
                return this.glassModuleRepository.getByName(moduleName).flatMap(module => {
                    return importRISIndividualFungalFile.importRISIndividualFungalFile(
                        inputFile,
                        action,
                        orgUnitId,
                        countryCode,
                        period,
                        eventListId,
                        module.programs !== undefined ? module.programs.at(0) : undefined,
                        module.name,
                        module.customDataColumns ? module.customDataColumns : [],
                        allCountries
                    );
                });
            }

            case "AMC": {
                const importAMCProductFile = new ImportAMCProductLevelData(
                    this.excelRepository,
                    this.instanceRepository,
                    this.trackerRepository,
                    this.glassDocumentsRepository,
                    this.glassUploadsRepository,
                    this.metadataRepository,
                    this.programRulesMetadataRepository,
                    this.atcRepository,
                    this.amcProductRepository,
                    this.amcSubstanceDataRepository
                );

                return importAMCProductFile.importAMCProductFile(
                    inputFile,
                    action,
                    eventListId,
                    orgUnitId,
                    orgUnitName,
                    moduleName,
                    period,
                    allCountries,
                    calculatedEventListFileId
                );
            }
            default: {
                return Future.error("Unknown module type");
            }
        }
    }
}

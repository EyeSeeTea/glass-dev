import { UseCase } from "../../../CompositionRoot";
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
import { EGASPProgramDefaultRepository } from "../../../data/repositories/download-empty-template/EGASPProgramDefaultRepository";
import { ExcelRepository } from "../../repositories/ExcelRepository";
import { GlassDocumentsRepository } from "../../repositories/GlassDocumentsRepository";
import { GlassUploadsDefaultRepository } from "../../../data/repositories/GlassUploadsDefaultRepository";
import { ProgramRulesMetadataRepository } from "../../repositories/program-rules/ProgramRulesMetadataRepository";
import { ImportRISIndividualFunghiFile } from "./amr-individual-funghi/ImportRISIndividualFunghiFile";
import { RISIndividualFunghiDataRepository } from "../../repositories/data-entry/RISIndividualFunghiDataRepository";
import { TrackerRepository } from "../../repositories/TrackerRepository";
import { GlassModuleDefaultRepository } from "../../../data/repositories/GlassModuleDefaultRepository";

export class ImportPrimaryFileUseCase implements UseCase {
    constructor(
        private risDataRepository: RISDataRepository,
        private risIndividualFunghiRepository: RISIndividualFunghiDataRepository,
        private metadataRepository: MetadataRepository,
        private dataValuesRepository: DataValuesRepository,
        private moduleRepository: GlassModuleRepository,
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private egaspProgramDefaultRepository: EGASPProgramDefaultRepository,
        private excelRepository: ExcelRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsDefaultRepository,
        private eGASPValidationRepository: ProgramRulesMetadataRepository,
        private trackerRepository: TrackerRepository,
        private glassModuleDefaultRepository: GlassModuleDefaultRepository
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
        eventListId: string | undefined
    ): FutureData<ImportSummary> {
        switch (moduleName) {
            case "AMR": {
                const importRISFile = new ImportRISFile(
                    this.risDataRepository,
                    this.metadataRepository,
                    this.dataValuesRepository,
                    this.moduleRepository
                );
                return importRISFile.importRISFile(inputFile, batchId, period, action, orgUnitId, countryCode, dryRun);
            }

            case "EGASP": {
                const importEGASPFile = new ImportEGASPFile(
                    this.dhis2EventsDefaultRepository,
                    this.egaspProgramDefaultRepository,
                    this.excelRepository,
                    this.glassDocumentsRepository,
                    this.glassUploadsRepository,
                    this.eGASPValidationRepository,
                    this.metadataRepository
                );

                return importEGASPFile.importEGASPFile(inputFile, action, eventListId, orgUnitId, orgUnitName, period);
            }

            case "AMR - Individual":
            case "AMR - Funghi": {
                const importRISIndividualFunghiFile = new ImportRISIndividualFunghiFile(
                    this.risIndividualFunghiRepository,
                    this.trackerRepository,
                    this.glassDocumentsRepository,
                    this.glassUploadsRepository
                );
                return this.glassModuleDefaultRepository.getByName(moduleName).flatMap(module => {
                    return importRISIndividualFunghiFile.importRISIndividualFunghiFile(
                        inputFile,
                        action,
                        orgUnitId,
                        countryCode,
                        period,
                        eventListId,
                        module.programs !== undefined ? module.programs.at(0) : undefined,
                        module.name
                    );
                });
            }
            default: {
                return Future.error("Unknown module type");
            }
        }
    }
}

import { UseCase } from "../../../CompositionRoot";
import { Future, FutureData } from "../../entities/Future";
import { MetadataRepository } from "../../repositories/MetadataRepository";
import { DataValuesRepository } from "../../repositories/data-entry/DataValuesRepository";
import { RISDataRepository } from "../../repositories/data-entry/RISDataRepository";
import { ImportSummary } from "../../entities/data-entry/ImportSummary";
import { GlassModuleRepository } from "../../repositories/GlassModuleRepository";
import { ImportStrategy } from "../../entities/data-entry/DataValuesSaveSummary";
import { ImportRISFile } from "./ImportRISFile";
import { ImportEGASPFile } from "./ImportEGASPFile";
import { Dhis2EventsDefaultRepository } from "../../../data/repositories/Dhis2EventsDefaultRepository";
import { EGASPProgramDefaultRepository } from "../../../data/repositories/bulk-load/EGASPProgramDefaultRepository";
import { ExcelRepository } from "../../repositories/ExcelRepository";
import { GlassDocumentsRepository } from "../../repositories/GlassDocumentsRepository";
import { GlassUploadsDefaultRepository } from "../../../data/repositories/GlassUploadsDefaultRepository";
import { EGASPValidationRepository } from "../../repositories/egasp-validate/EGASPValidationRepository";

export class ImportPrimaryFileUseCase implements UseCase {
    constructor(
        private risDataRepository: RISDataRepository,
        private metadataRepository: MetadataRepository,
        private dataValuesRepository: DataValuesRepository,
        private moduleRepository: GlassModuleRepository,
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private egaspProgramDefaultRepository: EGASPProgramDefaultRepository,
        private excelRepository: ExcelRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsDefaultRepository,
        private eGASPValidationRepository: EGASPValidationRepository
    ) {}

    public execute(
        moduleName: string,
        inputFile: File,
        batchId: string,
        year: string,
        action: ImportStrategy,
        orgUnit: string,
        countryCode: string,
        dryRun: boolean,
        eventListId: string | undefined
    ): FutureData<ImportSummary> {
        if (moduleName === "AMR") {
            const importRISFile = new ImportRISFile(
                this.risDataRepository,
                this.metadataRepository,
                this.dataValuesRepository,
                this.moduleRepository
            );
            return importRISFile.importRISFile(inputFile, batchId, year, action, orgUnit, countryCode, dryRun);
        } else if (moduleName === "EGASP") {
            const importEGASPFile = new ImportEGASPFile(
                this.dhis2EventsDefaultRepository,
                this.egaspProgramDefaultRepository,
                this.excelRepository,
                this.glassDocumentsRepository,
                this.glassUploadsRepository,
                this.eGASPValidationRepository
            );

            return importEGASPFile.importEGASPFile(inputFile, action, eventListId);
        } else {
            return Future.error("Unknown module type");
        }
    }
}

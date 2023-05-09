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
import { EGASPDataRepository } from "../../repositories/data-entry/EGASPDataRepository";

export class ImportPrimaryFileUseCase implements UseCase {
    constructor(
        private risDataRepository: RISDataRepository,
        private metadataRepository: MetadataRepository,
        private dataValuesRepository: DataValuesRepository,
        private moduleRepository: GlassModuleRepository,
        private egaspDataRepository: EGASPDataRepository
    ) {}

    public execute(
        moduleName: string,
        inputFile: File,
        batchId: string,
        year: string,
        action: ImportStrategy,
        orgUnit: string,
        countryCode: string,
        dryRun: boolean
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
            const importEGASPFile = new ImportEGASPFile(this.egaspDataRepository);
            return importEGASPFile.importEGASPFile();
        } else {
            return Future.error("Unknown module type");
        }
    }
}

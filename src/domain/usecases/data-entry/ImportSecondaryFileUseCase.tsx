import { UseCase } from "../../../CompositionRoot";
import { Future, FutureData } from "../../entities/Future";
import { MetadataRepository } from "../../repositories/MetadataRepository";
import { DataValuesRepository } from "../../repositories/data-entry/DataValuesRepository";
import { SampleDataRepository } from "../../repositories/data-entry/SampleDataRepository";
import { ImportOptions, ImportSummary } from "../../entities/data-entry/ImportSummary";
import { ImportSampleFile } from "./amr/ImportSampleFile";
import { ImportAMCSubstanceLevelData } from "./amc/ImportAMCSubstanceLevelData";
import { ExcelRepository } from "../../repositories/ExcelRepository";
import { InstanceDefaultRepository } from "../../../data/repositories/InstanceDefaultRepository";
import { GlassDocumentsDefaultRepository } from "../../../data/repositories/GlassDocumentsDefaultRepository";
import { GlassUploadsRepository } from "../../repositories/GlassUploadsRepository";
import { Dhis2EventsDefaultRepository } from "../../../data/repositories/Dhis2EventsDefaultRepository";
import { ProgramRulesMetadataRepository } from "../../repositories/program-rules/ProgramRulesMetadataRepository";

export class ImportSecondaryFileUseCase implements UseCase {
    constructor(
        private sampleDataRepository: SampleDataRepository,
        private metadataRepository: MetadataRepository,
        private dataValuesRepository: DataValuesRepository,
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceDefaultRepository,
        private glassDocumentsRepository: GlassDocumentsDefaultRepository,
        private glassUploadsRepository: GlassUploadsRepository,
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private programRulesMetadataRepository: ProgramRulesMetadataRepository
    ) {}

    public execute(
        inputFile: File,
        options: ImportOptions,
        calculatedEventListFileId?: string
    ): FutureData<ImportSummary> {
        const {
            moduleName,
            batchId,
            period: year,
            action,
            orgUnitId,
            orgUnitName,
            countryCode,
            dryRun,
            eventListId,
        } = options;
        switch (moduleName) {
            case "AMR":
            case "AMR - Individual": {
                const importSampleFile = new ImportSampleFile(
                    this.sampleDataRepository,
                    this.metadataRepository,
                    this.dataValuesRepository
                );

                return importSampleFile.import(inputFile, batchId, year, action, orgUnitId, countryCode, dryRun);
            }
            case "AMC": {
                const importRawSubstanceData = new ImportAMCSubstanceLevelData(
                    this.excelRepository,
                    this.instanceRepository,
                    this.glassDocumentsRepository,
                    this.glassUploadsRepository,
                    this.dhis2EventsDefaultRepository,
                    this.metadataRepository,
                    this.programRulesMetadataRepository
                );
                return importRawSubstanceData.import(
                    inputFile,
                    action,
                    eventListId,
                    moduleName,
                    orgUnitId,
                    orgUnitName,
                    year,
                    calculatedEventListFileId
                );
            }

            default:
                return Future.error("Unknown module type");
        }
    }
}

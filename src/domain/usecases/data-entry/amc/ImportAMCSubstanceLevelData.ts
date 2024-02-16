import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { FutureData } from "../../../entities/Future";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import { InstanceDefaultRepository } from "../../../../data/repositories/InstanceDefaultRepository";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { Dhis2EventsDefaultRepository } from "../../../../data/repositories/Dhis2EventsDefaultRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { ImportBLTemplateEventProgram } from "../ImportBLTemplateEventProgram";
import { ProgramRulesMetadataRepository } from "../../../repositories/program-rules/ProgramRulesMetadataRepository";

export const AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID = "q8aSKr17J5S";
export const AMC_SUBSTANCE_CALCULATED_CONSUMPTION_PROGRAM_ID = "eUmWZeKZNrg";

export class ImportAMCSubstanceLevelData {
    constructor(
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceDefaultRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository,
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private metadataRepository: MetadataRepository,
        private programRulesMetadataRepository: ProgramRulesMetadataRepository
    ) {}

    public import(
        file: File,
        action: ImportStrategy,
        eventListId: string | undefined,
        moduleName: string,
        orgUnitId: string,
        orgUnitName: string,
        period: string,
        calculatedEventListFileId?: string
    ): FutureData<ImportSummary> {
        const importBLTemplateEventProgram = new ImportBLTemplateEventProgram(
            this.excelRepository,
            this.instanceRepository,
            this.glassDocumentsRepository,
            this.glassUploadsRepository,
            this.dhis2EventsDefaultRepository,
            this.metadataRepository,
            this.programRulesMetadataRepository
        );

        return importBLTemplateEventProgram.import(
            file,
            action,
            eventListId,
            moduleName,
            orgUnitId,
            orgUnitName,
            period,
            AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID,
            "secondaryUploadId",
            calculatedEventListFileId
        );
    }
}

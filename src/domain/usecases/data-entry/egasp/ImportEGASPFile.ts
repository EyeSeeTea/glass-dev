import { Dhis2EventsDefaultRepository } from "../../../../data/repositories/Dhis2EventsDefaultRepository";
import { FutureData } from "../../../entities/Future";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { ProgramRulesMetadataRepository } from "../../../repositories/program-rules/ProgramRulesMetadataRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { EGASP_PROGRAM_ID } from "../../../../data/repositories/program-rule/ProgramRulesMetadataDefaultRepository";
import { InstanceDefaultRepository } from "../../../../data/repositories/InstanceDefaultRepository";
import { ImportBLTemplateEventProgram } from "../ImportBLTemplateEventProgram";
import { GlassATCDefaultRepository } from "../../../../data/repositories/GlassATCDefaultRepository";

export class ImportEGASPFile {
    constructor(
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        // private egaspProgramDefaultRepository: EGASPProgramDefaultRepository, TO DO : Delete?
        private excelRepository: ExcelRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository,
        private programRulesMetadataRepository: ProgramRulesMetadataRepository,
        private metadataRepository: MetadataRepository,
        private instanceRepository: InstanceDefaultRepository,
        private glassAtcRepository: GlassATCDefaultRepository
    ) {}

    public importEGASPFile(
        file: File,
        action: ImportStrategy,
        eventListId: string | undefined,
        moduleName: string,
        orgUnitId: string,
        orgUnitName: string,
        period: string
    ): FutureData<ImportSummary> {
        const importBLTemplateEventProgram = new ImportBLTemplateEventProgram(
            this.excelRepository,
            this.instanceRepository,
            this.glassDocumentsRepository,
            this.glassUploadsRepository,
            this.dhis2EventsDefaultRepository,
            this.metadataRepository,
            this.programRulesMetadataRepository,
            this.glassAtcRepository
        );

        return importBLTemplateEventProgram.import(
            file,
            action,
            eventListId,
            moduleName,
            orgUnitId,
            orgUnitName,
            period,
            EGASP_PROGRAM_ID,
            "primaryUploadId"
        );
    }
}

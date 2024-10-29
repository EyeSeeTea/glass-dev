import { Dhis2EventsDefaultRepository } from "../../../../data/repositories/Dhis2EventsDefaultRepository";
import { FutureData } from "../../../entities/Future";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { EGASP_PROGRAM_ID } from "../../../../data/repositories/program-rule/ProgramRulesMetadataDefaultRepository";
import { InstanceRepository } from "../../../repositories/InstanceRepository";
import { DeleteBLTemplateEventProgram } from "../DeleteBLTemplateEventProgram";
import { UseCase } from "../../../../CompositionRoot";

export class DeleteEGASPDatasetUseCase implements UseCase {
    constructor(
        private options: {
            dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository;
            excelRepository: ExcelRepository;
            glassDocumentsRepository: GlassDocumentsRepository;
            metadataRepository: MetadataRepository;
            instanceRepository: InstanceRepository;
        }
    ) {}

    public execute(arrayBuffer: ArrayBuffer, eventListFileId: string | undefined): FutureData<ImportSummary> {
        const deleteBLTemplateEventProgram = new DeleteBLTemplateEventProgram(
            this.options.excelRepository,
            this.options.instanceRepository,
            this.options.glassDocumentsRepository,
            this.options.dhis2EventsDefaultRepository,
            this.options.metadataRepository
        );

        return deleteBLTemplateEventProgram.delete(arrayBuffer, EGASP_PROGRAM_ID, eventListFileId);
    }
}

import { Dhis2EventsDefaultRepository } from "../../../../data/repositories/Dhis2EventsDefaultRepository";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { FutureData } from "../../../entities/Future";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { InstanceRepository } from "../../../repositories/InstanceRepository";
import { UseCase } from "../../../../CompositionRoot";
import { DeleteBLTemplateEventProgram } from "../DeleteBLTemplateEventProgram";
import { AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID } from "./ImportAMCSubstanceLevelData";

export class DeleteAMCSubstanceLevelDataUseCase implements UseCase {
    constructor(
        private options: {
            dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository;
            excelRepository: ExcelRepository;
            glassDocumentsRepository: GlassDocumentsRepository;
            metadataRepository: MetadataRepository;
            instanceRepository: InstanceRepository;
        }
    ) {}
    public execute(
        arrayBuffer: ArrayBuffer,
        eventListFileId: string | undefined,
        calculatedEventListFileId?: string
    ): FutureData<ImportSummary> {
        const deleteBLTemplateEventProgram = new DeleteBLTemplateEventProgram(
            this.options.excelRepository,
            this.options.instanceRepository,
            this.options.glassDocumentsRepository,
            this.options.dhis2EventsDefaultRepository,
            this.options.metadataRepository
        );

        return deleteBLTemplateEventProgram.delete(
            arrayBuffer,
            AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID,
            eventListFileId,
            calculatedEventListFileId
        );
    }
}

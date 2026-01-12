import { Dhis2EventsDefaultRepository } from "../../../../data/repositories/Dhis2EventsDefaultRepository";
import { FutureData } from "../../../entities/Future";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { EGASP_PROGRAM_ID } from "../../../../data/repositories/program-rule/ProgramRulesMetadataDefaultRepository";
import { InstanceRepository } from "../../../repositories/InstanceRepository";
import { DeleteBLTemplateEventProgram } from "../DeleteBLTemplateEventProgram";
import { GlassUploads } from "../../../entities/GlassUploads";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { Maybe } from "../../../../utils/ts-utils";

export class DeleteEGASPDataset {
    constructor(
        private options: {
            dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository;
            excelRepository: ExcelRepository;
            glassDocumentsRepository: GlassDocumentsRepository;
            metadataRepository: MetadataRepository;
            instanceRepository: InstanceRepository;
            glassUploadsRepository: GlassUploadsRepository;
            trackerRepository: TrackerRepository;
        }
    ) {}

    public delete(
        arrayBuffer: ArrayBuffer,
        upload: GlassUploads,
        asyncDeleteChunkSize: Maybe<number>
    ): FutureData<ImportSummary> {
        const deleteBLTemplateEventProgram = new DeleteBLTemplateEventProgram(
            this.options.excelRepository,
            this.options.instanceRepository,
            this.options.glassDocumentsRepository,
            this.options.dhis2EventsDefaultRepository,
            this.options.metadataRepository,
            this.options.glassUploadsRepository,
            this.options.trackerRepository
        );

        return deleteBLTemplateEventProgram.delete({
            arrayBuffer,
            programId: EGASP_PROGRAM_ID,
            upload,
            asyncDeleteChunkSize,
        });
    }
}

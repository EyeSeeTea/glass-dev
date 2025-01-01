import { FutureData } from "../../../entities/Future";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { downloadIdsAndDeleteTrackedEntitiesUsingFileBlob } from "../utils/downloadIdsAndDeleteTrackedEntities";
import { AMR_GLASS_AMR_TET_PATIENT, AMRIProgramID } from "./ImportRISIndividualFungalFile";
import { Id } from "../../../entities/Ref";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { GlassUploads } from "../../../entities/GlassUploads";

// NOTICE: code adapted for node environment from ImportRISIndividualFungalFile.ts (only DELETE)
export class DeleteRISIndividualFungalFile {
    constructor(
        private options: {
            trackerRepository: TrackerRepository;
            glassDocumentsRepository: GlassDocumentsRepository;
            metadataRepository: MetadataRepository;
            glassUploadsRepository: GlassUploadsRepository;
        }
    ) {}

    public delete(upload: GlassUploads, programId: Id | undefined): FutureData<ImportSummary> {
        const AMRIProgramIDl = programId || AMRIProgramID;
        return downloadIdsAndDeleteTrackedEntitiesUsingFileBlob(
            upload,
            AMRIProgramIDl,
            "DELETE",
            AMR_GLASS_AMR_TET_PATIENT,
            this.options.glassDocumentsRepository,
            this.options.trackerRepository,
            this.options.metadataRepository,
            this.options.glassUploadsRepository
        );
    }
}

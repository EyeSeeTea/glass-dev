import { FutureData } from "../../../entities/Future";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { UseCase } from "../../../../CompositionRoot";
import { AMR_GLASS_AMR_TET_PATIENT } from "./ImportRISIndividualFungalFile";
import { downloadIdsAndDeleteTrackedEntitiesUsingFileBlob } from "../utils/downloadIdsAndDeleteTrackedEntities";

// NOTICE: code adapted for node environment from ImportRISIndividualFungalFile.ts (only DELETE)
export class DeleteRISIndividualFungalFileUseCase implements UseCase {
    constructor(
        private options: {
            trackerRepository: TrackerRepository;
            glassDocumentsRepository: GlassDocumentsRepository;
            metadataRepository: MetadataRepository;
        }
    ) {}

    public execute(orgUnitId: string, eventListId: string | undefined): FutureData<ImportSummary> {
        return downloadIdsAndDeleteTrackedEntitiesUsingFileBlob(
            eventListId,
            orgUnitId,
            "DELETE",
            AMR_GLASS_AMR_TET_PATIENT,
            this.options.glassDocumentsRepository,
            this.options.trackerRepository,
            this.options.metadataRepository
        );
    }
}

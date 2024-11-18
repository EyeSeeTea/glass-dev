import { Future, FutureData } from "../../entities/Future";
import { MetadataRepository } from "../../repositories/MetadataRepository";
import { DataValuesRepository } from "../../repositories/data-entry/DataValuesRepository";
import { RISDataRepository } from "../../repositories/data-entry/RISDataRepository";
import { ImportSummary } from "../../entities/data-entry/ImportSummary";
import { Dhis2EventsDefaultRepository } from "../../../data/repositories/Dhis2EventsDefaultRepository";
import { ExcelRepository } from "../../repositories/ExcelRepository";
import { GlassDocumentsRepository } from "../../repositories/GlassDocumentsRepository";
import { TrackerRepository } from "../../repositories/TrackerRepository";
import { AMCSubstanceDataRepository } from "../../repositories/data-entry/AMCSubstanceDataRepository";
import { GlassUploadsRepository } from "../../repositories/GlassUploadsRepository";
import { InstanceRepository } from "../../repositories/InstanceRepository";
import { UseCase } from "../../../CompositionRoot";
import { GlassModule } from "../../entities/GlassModule";
import { GlassUploads } from "../../entities/GlassUploads";
import { DeleteAMCProductLevelData } from "./amc/DeleteAMCProductLevelData";
import { DeleteRISIndividualFungalFile } from "./amr-individual-fungal/DeleteRISIndividualFungalFile";
import { DeleteRISDataset } from "./amr/DeleteRISDataset";
import { DeleteEGASPDataset } from "./egasp/DeleteEGASPDataset";

export class DeletePrimaryFileDataUseCase implements UseCase {
    constructor(
        private options: {
            risDataRepository: RISDataRepository;
            metadataRepository: MetadataRepository;
            dataValuesRepository: DataValuesRepository;
            dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository;
            excelRepository: ExcelRepository;
            glassDocumentsRepository: GlassDocumentsRepository;
            instanceRepository: InstanceRepository;
            glassUploadsRepository: GlassUploadsRepository;
            trackerRepository: TrackerRepository;
            amcSubstanceDataRepository: AMCSubstanceDataRepository;
        }
    ) {}

    public execute(
        currentModule: GlassModule,
        upload: GlassUploads,
        arrayBuffer: ArrayBuffer
    ): FutureData<ImportSummary> {
        const { name: currentModuleName } = currentModule;
        switch (currentModuleName) {
            case "AMR": {
                return new DeleteRISDataset(this.options).delete(arrayBuffer);
            }

            case "EGASP": {
                return new DeleteEGASPDataset(this.options).delete(arrayBuffer, upload);
            }

            case "AMR - Individual":
            case "AMR - Fungal": {
                const programId = currentModule.programs !== undefined ? currentModule.programs.at(0)?.id : undefined;
                return new DeleteRISIndividualFungalFile(this.options).delete(upload, programId);
            }

            case "AMC": {
                return new DeleteAMCProductLevelData(this.options).delete(arrayBuffer, upload);
            }

            default: {
                return Future.error(`Primary upload async deletion for module ${currentModuleName} not found`);
            }
        }
    }
}

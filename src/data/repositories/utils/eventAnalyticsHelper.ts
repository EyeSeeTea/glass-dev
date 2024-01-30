import { Id } from "../../../domain/entities/Ref";
import { AMC_PRODUCT_REGISTER_PROGRAM_ID } from "../../../domain/usecases/data-entry/amc/ImportAMCProductLevelData";
import {
    AMRCandidaProgramStageId,
    AMRDataProgramStageId,
    AMRIProgramID,
} from "../../../domain/usecases/data-entry/amr-individual-fungal/ImportRISIndividualFungalFile";
import { EGASP_PROGRAM_ID } from "../program-rule/ProgramRulesMetadataDefaultRepository";

const EGASP_STAGE_ID = "ioSih2sAIUb";
export const getProgramIdForModule = (module: string): { programId: Id; programStageId?: Id } | undefined => {
    switch (module) {
        case "EGASP":
            return { programId: EGASP_PROGRAM_ID, programStageId: EGASP_STAGE_ID };
        case "AMC":
            return { programId: AMC_PRODUCT_REGISTER_PROGRAM_ID };
        case "AMR - Individual":
            return { programId: AMRIProgramID, programStageId: AMRDataProgramStageId };
        case "AMR - Fungal":
            return { programId: AMRIProgramID, programStageId: AMRCandidaProgramStageId };

        default:
            return undefined;
    }
};

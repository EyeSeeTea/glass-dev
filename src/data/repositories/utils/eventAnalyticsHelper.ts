import { Id } from "../../../domain/entities/Ref";

export const getProgramIdForModule = (module: string): { programId: Id; programStageId?: Id } => {
    switch (module) {
        case "EGASP":
            return { programId: "SOjanrinfuG", programStageId: "ioSih2sAIUb" };
        default:
            return { programId: "", programStageId: "" };
    }
};

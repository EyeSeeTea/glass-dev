import { Id } from "../../../domain/entities/Ref";

export const getProgramIdForModule = (module: string): { programId: Id; programStageId?: Id } => {
    switch (module) {
        case "EGASP":
            return { programId: "SOjanrinfuG", programStageId: "ioSih2sAIUb" };
        case "AMC":
            return { programId: "G6ChA5zMW9n" };

        default:
            return { programId: "", programStageId: "" };
    }
};

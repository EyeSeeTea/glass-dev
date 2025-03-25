import { Id } from "../Ref";

export type ImportStrategy = "CREATE" | "UPDATE" | "CREATE_AND_UPDATE" | "DELETE";

export interface DataValuesSaveSummary {
    status: "SUCCESS" | "ERROR" | "WARNING";
    description: string;
    importCount: {
        imported: number;
        updated: number;
        ignored: number;
        deleted: number;
    };
    conflicts?: Array<{
        object: Id;
        value: string;
    }>;
    importTime: Date;
}

export function getDefaultErrorDataValuesSaveSummary(error?: string): DataValuesSaveSummary {
    return {
        status: "ERROR",
        description: error || "",
        importCount: {
            imported: 0,
            updated: 0,
            ignored: 0,
            deleted: 0,
        },
        conflicts: [
            {
                object: "",
                value: error || "",
            },
        ],
        importTime: new Date(),
    };
}

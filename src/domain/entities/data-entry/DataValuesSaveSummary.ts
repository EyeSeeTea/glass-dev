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

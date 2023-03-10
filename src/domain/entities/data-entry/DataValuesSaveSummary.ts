import { Id } from "../Ref";

// declare type ImportStrategy =
//     | "CREATE"
//     | "UPDATE"
//     | "CREATE_AND_UPDATE"
//     | "DELETE"
//     | "NEW_AND_UPDATES"
//     | "NEW"
//     | "UPDATES"
//     | "DELETES";

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
}

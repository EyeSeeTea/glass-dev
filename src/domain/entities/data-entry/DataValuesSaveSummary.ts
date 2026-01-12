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

export function joinAllDataValuesSummary(dataValuesSummaries: DataValuesSaveSummary[]): DataValuesSaveSummary {
    const finalDataValuesSummary: DataValuesSaveSummary = dataValuesSummaries.reduce(
        (acc: DataValuesSaveSummary, data: DataValuesSaveSummary) => {
            return {
                status: data.status === "ERROR" ? "ERROR" : acc.status,
                description: [acc.description, data.description].filter(Boolean).join(" | "),
                importCount: {
                    imported: acc.importCount.imported + data.importCount.imported,
                    updated: acc.importCount.updated + data.importCount.updated,
                    ignored: acc.importCount.ignored + data.importCount.ignored,
                    deleted: acc.importCount.deleted + data.importCount.deleted,
                },
                conflicts: [...(acc.conflicts || []), ...(data.conflicts || [])],
                importTime: new Date(),
            };
        },
        {
            status: "SUCCESS",
            description: "",
            importCount: {
                imported: 0,
                updated: 0,
                ignored: 0,
                deleted: 0,
            },
            conflicts: [],
            importTime: new Date(),
        }
    );

    return finalDataValuesSummary;
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

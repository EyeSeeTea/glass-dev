export type ImportSummary = {
    status: "SUCCESS" | "ERROR" | "WARNING";
    importCount: {
        imported: number;
        updated: number;
        ignored: number;
        deleted: number;
    };
    nonBlockingErrors: ConsistencyError[];
    blockingErrors: ConsistencyError[];
};

export type ConsistencyError = {
    error: string;
    count: number;
    lines?: number[];
};

export type ImportConflictCount = {
    importCount: {
        imported: number;
        updated: number;
        ignored: number;
        deleted: number;
    };
    conflicts: { object: string; value: string }[];
};

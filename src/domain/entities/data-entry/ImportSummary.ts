export type ImportSummary = {
    status: "SUCCESS" | "ERROR" | "WARNING";
    importCount: {
        imported: number;
        updated: number;
        ignored: number;
        deleted: number;
    };
    nonBlockingErrors: ImporError[];
    blockingErrors: ImporError[];
};

export type ImporError = {
    error: string;
    count: number;
};

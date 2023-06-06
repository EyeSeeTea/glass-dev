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
    importTime?: Date;
};

export type ConsistencyError = {
    error: string;
    count: number;
    lines?: number[];
};

export type BlockingError = {
    type: "blocking";
    error: ConsistencyError;
};

export type NonBlockingError = {
    type: "non-blocking";
    error: ConsistencyError;
};

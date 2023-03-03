export type ImportSummary = {
    status: "SUCCESS" | "ERROR" | "WARNING";
    nonBlockingErrors: ImporError[];
    blockingErrors: ImporError[];
};

export type ImporError = {
    error: string;
    count: number;
};

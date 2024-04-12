import { ImportStrategy } from "./DataValuesSaveSummary";

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

export type ImportSummaryErrors = {
    nonBlockingErrors: ConsistencyError[];
    blockingErrors: ConsistencyError[];
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

export interface ImportOptions {
    moduleName: string;
    batchId: string;
    period: string;
    action: ImportStrategy;
    orgUnitId: string;
    orgUnitName: string;
    countryCode: string;
    dryRun: boolean;
    eventListId: string | undefined;
}

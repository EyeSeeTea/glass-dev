import { Id } from "../Ref";

export type ImportSummary = {
    status: "SUCCESS" | "ERROR" | "WARNING";
    importCount: {
        imported: number;
        updated: number;
        ignored: number;
        deleted: number;
        total: number;
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

export type ImportSummaryWithEventIdList = { importSummary: ImportSummary; eventIdList: Id[] };

export type MergedImportSummaryWithEventIdList = {
    allImportSummaries: ImportSummary[];
    mergedEventIdList: Id[];
};

export function getDefaultErrorImportSummaryWithEventIdList(options: {
    blockingErrors?: ConsistencyError[];
    nonBlockingErrors?: ConsistencyError[];
}): ImportSummaryWithEventIdList {
    return {
        importSummary: getDefaultErrorImportSummary({
            blockingErrors: options.blockingErrors,
            nonBlockingErrors: options.nonBlockingErrors,
        }),
        eventIdList: [],
    };
}

export function getDefaultErrorImportSummary(options: {
    blockingErrors?: ConsistencyError[];
    nonBlockingErrors?: ConsistencyError[];
}): ImportSummary {
    return {
        status: "ERROR",
        importCount: {
            imported: 0,
            updated: 0,
            ignored: 0,
            deleted: 0,
            total: 0,
        },
        nonBlockingErrors: options.nonBlockingErrors ?? [],
        blockingErrors: options.blockingErrors ?? [],
    };
}

export function mergeImportSummaries(
    importSummaries: ImportSummaryWithEventIdList[]
): MergedImportSummaryWithEventIdList {
    const importSummariesWithMergedEventIdList = importSummaries.reduce(
        (
            acc: {
                allImportSummaries: ImportSummary[];
                mergedEventIdList: Id[];
            },
            data: {
                importSummary: ImportSummary;
                eventIdList: Id[];
            }
        ) => {
            const { importSummary } = data;
            return {
                allImportSummaries: [...acc.allImportSummaries, importSummary],
                mergedEventIdList: [...acc.mergedEventIdList, ...data.eventIdList],
            };
        },
        {
            allImportSummaries: [],
            mergedEventIdList: [],
        }
    );

    return importSummariesWithMergedEventIdList;
}

export function joinAllImportSummaries(importSummaries: ImportSummary[]): ImportSummary {
    const finalImportSummary: ImportSummary = importSummaries.reduce(
        (acc: ImportSummary, data: ImportSummary) => {
            return {
                status: data.status === "ERROR" ? "ERROR" : acc.status,
                importCount: {
                    imported: acc.importCount.imported + data.importCount.imported,
                    updated: acc.importCount.updated + data.importCount.updated,
                    deleted: acc.importCount.deleted + data.importCount.deleted,
                    ignored: acc.importCount.ignored + data.importCount.ignored,
                    total: acc.importCount.total + data.importCount.total,
                },
                nonBlockingErrors: [...acc.nonBlockingErrors, ...data.nonBlockingErrors],
                blockingErrors: [...acc.blockingErrors, ...data.blockingErrors],
            };
        },
        {
            status: "SUCCESS",
            importCount: {
                imported: 0,
                updated: 0,
                deleted: 0,
                ignored: 0,
                total: 0,
            },
            nonBlockingErrors: [],
            blockingErrors: [],
        }
    );

    return finalImportSummary;
}

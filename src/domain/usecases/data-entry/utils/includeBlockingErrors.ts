import { ConsistencyError, ImportSummary } from "../../../entities/data-entry/ImportSummary";

export function includeBlockingErrors(importSummary: ImportSummary, blockingErrors: ConsistencyError[]): ImportSummary {
    const status = blockingErrors ? "ERROR" : importSummary.status;

    return {
        ...importSummary,
        status,
        blockingErrors: [...importSummary.blockingErrors, ...blockingErrors],
    };
}

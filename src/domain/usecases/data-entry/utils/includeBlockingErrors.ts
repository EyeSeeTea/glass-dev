import { ConsistencyError, ImportSummary } from "../../../entities/data-entry/ImportSummary";

export function includeBlokingErrors(importSummary: ImportSummary, blokingErrors: ConsistencyError[]): ImportSummary {
    const status = blokingErrors ? "ERROR" : importSummary.status;

    return {
        ...importSummary,
        status,
        blockingErrors: [...importSummary.blockingErrors, ...blokingErrors],
    };
}

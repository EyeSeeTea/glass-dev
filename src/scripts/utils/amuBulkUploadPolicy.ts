import { ImportSummary } from "../../domain/entities/data-entry/ImportSummary";
import { GlassDataSubmission } from "../../domain/entities/GlassDataSubmission";
import { GlassUploads } from "../../domain/entities/GlassUploads";
import { getCurrentYear, getLastNYears, getRangeOfYears } from "../../utils/currentPeriodHelper";

/**
 * Pure decision logic for the AMU bulk upload script.
 *
 * This module deliberately contains NO I/O, no DHIS2 access and no mutable state: it exists so
 * the script's decisions can be unit-tested. `bulkUploadAMUFiles.ts` itself cannot be imported
 * from a test because it calls `main()` at module load, writes the progress CSV at import time
 * and runs `dotenv.config()`.
 */

export type AmuFileType = "product" | "substance";

/** File-type labels as stored on the upload record, matching the UI's moduleProperties. */
export const FILE_TYPE_LABELS: Record<AmuFileType, string> = {
    product: "Product Level Data",
    substance: "Substance Level Data",
};

// ---------------------------------------------------------------------------
// Filename policy
// ---------------------------------------------------------------------------

/**
 * Extensions accepted for AMU data files.
 *
 * `.xlsx` ONLY, and this is a genuine constraint rather than a convention: validation goes
 * through SheetJS (which would also read .xls/.csv/.ods), but the import goes through
 * ExcelPopulateDefaultRepository.loadTemplateFromArrayBuffer -> XLSX.fromDataAsync
 * (xlsx-populate), which is OOXML-only. An .xls file would validate and then fail deep inside
 * the import with an opaque parse error.
 */
const SUPPORTED_EXTENSION = ".xlsx";

/** Non-data files that are expected to sit alongside the data and are silently ignored. */
const ADMINISTRATIVE_BASENAMES = ["rename_products", "rename_substance", "recording", "recoding"];

export type ParsedFileName =
    | { kind: "ok"; fileType: AmuFileType; orgUnitCode: string; period: string }
    /** Transient artefact (Excel lock file). Not reported at all. */
    | { kind: "ignore"; reason: string }
    /** Expected non-data file. Reported as SKIPPED so it is visible but harmless. */
    | { kind: "skip"; reason: string }
    /** A file that looks like data but cannot be trusted. Reported as FAILED. */
    | { kind: "reject"; reason: string };

/**
 * Parses `<fileType>_<orgUnitCode>_<period>.xlsx` into a validated descriptor.
 *
 * Every rejection is explicit. Before this existed the script did
 * `const [fileType] = fileName.split("_")` and then branched `fileType === "product" ? ... :
 * <substance>`, so ANY name that was not exactly `product_*` — a capitalised `Product_`, a
 * stray PDF, an Excel lock file — was silently imported as substance-level data. It also
 * derived the period with `lastIndexOf("_")`, which returns the whole basename when there is
 * no underscore, and that value was then used to CREATE a data submission.
 */
export function parseAmuFileName(fileName: string): ParsedFileName {
    if (fileName.startsWith("~$")) {
        return { kind: "ignore", reason: "Excel lock file" };
    }

    const lastDot = fileName.lastIndexOf(".");
    if (lastDot <= 0) {
        return { kind: "reject", reason: `Filename has no extension: "${fileName}"` };
    }

    const baseName = fileName.slice(0, lastDot);
    const extension = fileName.slice(lastDot).toLowerCase();

    if (ADMINISTRATIVE_BASENAMES.includes(baseName.toLowerCase())) {
        return { kind: "skip", reason: `Administrative file, not data: "${fileName}"` };
    }

    if (extension !== SUPPORTED_EXTENSION) {
        return {
            kind: "reject",
            reason: `Unsupported extension "${extension}" for "${fileName}". Only ${SUPPORTED_EXTENSION} can be imported.`,
        };
    }

    const parts = baseName.split("_");
    if (parts.length !== 3) {
        return {
            kind: "reject",
            reason: `Invalid filename "${fileName}". Expected <product|substance>_<orgUnitCode>_<year>${SUPPORTED_EXTENSION}`,
        };
    }

    const [rawFileType, orgUnitCode, period] = parts as [string, string, string];

    if (rawFileType !== "product" && rawFileType !== "substance") {
        return {
            kind: "reject",
            reason: `Invalid file type "${rawFileType}" in "${fileName}". Must be exactly "product" or "substance" (case-sensitive).`,
        };
    }

    if (!orgUnitCode) {
        return { kind: "reject", reason: `Missing org unit code in "${fileName}"` };
    }

    if (!/^\d{4}$/.test(period)) {
        return { kind: "reject", reason: `Invalid period "${period}" in "${fileName}". Expected a 4-digit year.` };
    }

    return { kind: "ok", fileType: rawFileType, orgUnitCode, period };
}

/**
 * Whether a 4-digit year falls inside the range the application itself considers valid for the
 * module, derived from `GlassModule.startPeriod` / `populateCurrentYearInHistory` exactly as the
 * UI does (usePopulateDataSubmissionHistory.ts / data-file-history/Filter.tsx).
 *
 * Deliberately advisory rather than fatal: this is used for a historical backfill that may
 * legitimately predate `startPeriod`, and `getLastNYears` defaults to only 7 years. Junk periods
 * are already rejected by `parseAmuFileName`'s 4-digit check; this exists so an out-of-range
 * year is surfaced for a human decision rather than silently accepted or silently dropped.
 */
export function isYearInConfiguredRange(
    period: string,
    config: { startPeriod?: number; populateCurrentYearInHistory?: boolean }
): boolean {
    const addCurrentYear = config.populateCurrentYearInHistory ?? false;
    const validYears = config.startPeriod
        ? getRangeOfYears(addCurrentYear ? getCurrentYear() : getCurrentYear() - 1, config.startPeriod)
        : getLastNYears(addCurrentYear);

    return validYears.includes(period);
}

// ---------------------------------------------------------------------------
// Upload / submission state classification
// ---------------------------------------------------------------------------

export type FileState =
    /** An upload of the OTHER file type already holds this country-year. AMC allows only one. */
    | { kind: "conflict"; conflicting: GlassUploads }
    /** Upload COMPLETED and the submission already reached a terminal state. */
    | { kind: "done" }
    /** Upload COMPLETED but the submission transitions did not all run. */
    | { kind: "finalize-submission"; upload: GlassUploads; transitions: SubmissionTransition[] }
    /** VALIDATED: imported + calculated; only completion remains. */
    | { kind: "resume-complete"; upload: GlassUploads }
    /** IMPORTED with an event list and no calculation yet: safe to calculate. */
    | { kind: "resume-calculate"; upload: GlassUploads }
    /** Document + upload record exist but nothing was imported. Must not be duplicated. */
    | { kind: "orphaned-upload"; upload: GlassUploads }
    /** Cannot be progressed safely without a human. */
    | { kind: "needs-review"; upload: GlassUploads; reason: string }
    /** Nothing exists: run the full flow. */
    | { kind: "fresh" };

export type SubmissionTransition = "COMPLETE" | "PENDING_APPROVAL";

function matchesFileType(upload: GlassUploads, fileType: AmuFileType): boolean {
    return (upload.fileType ?? "").toLowerCase().includes(fileType);
}

/**
 * Decides what to do with a file given what already exists for its submission.
 *
 * Ordering matters and is load-bearing:
 *  - conflict is checked first because it invalidates the whole submission regardless of what
 *    the same-type uploads look like;
 *  - a COMPLETED upload is classified against the CURRENT submission status, because the
 *    script previously returned "completed" before consulting the submission at all, which made
 *    a run interrupted between setUploadStatus("COMPLETED") and the submission writes
 *    permanently unrepairable: every later run skipped it;
 *  - an IMPORTED upload that already has `calculatedEventListFileId` must NOT be recalculated.
 *    Neither calculation use case deletes before writing, and both post events with blank or
 *    freshly random ids, so re-running duplicates every calculated event.
 */
export function classifyFileState(params: {
    fileType: AmuFileType;
    existingUploads: GlassUploads[];
    submission: Pick<GlassDataSubmission, "status">;
}): FileState {
    const { fileType, existingUploads, submission } = params;

    // "DELETED" exists in the GlassUploadsStatus union but is never assigned anywhere in src/;
    // deletion is a hard tracker-event delete. Excluded defensively.
    const live = existingUploads.filter(upload => upload.status !== "DELETED");

    const oppositeType: AmuFileType = fileType === "product" ? "substance" : "product";
    const conflicting = live.find(
        upload =>
            matchesFileType(upload, oppositeType) &&
            (upload.status === "IMPORTED" || upload.status === "VALIDATED" || upload.status === "COMPLETED")
    );
    if (conflicting) return { kind: "conflict", conflicting };

    const matches = live.filter(upload => matchesFileType(upload, fileType));

    const completed = matches.find(upload => upload.status === "COMPLETED");
    if (completed) {
        switch (submission.status) {
            case "PENDING_APPROVAL":
            case "APPROVED":
                return { kind: "done" };
            case "COMPLETE":
                return { kind: "finalize-submission", upload: completed, transitions: ["PENDING_APPROVAL"] };
            case "NOT_COMPLETED":
                return {
                    kind: "finalize-submission",
                    upload: completed,
                    transitions: ["COMPLETE", "PENDING_APPROVAL"],
                };
            // REJECTED / PENDING_UPDATE_APPROVAL / UPDATE_REQUEST_ACCEPTED all encode a WHO-side
            // decision taken AFTER submission. Pushing such a submission back to PENDING_APPROVAL
            // would overwrite a human adjudication, so escalate instead.
            default:
                return {
                    kind: "needs-review",
                    upload: completed,
                    reason: `Upload is COMPLETED but the submission is ${submission.status}, which reflects a WHO-side decision. Resolve manually.`,
                };
        }
    }

    const validated = matches.find(upload => upload.status === "VALIDATED");
    if (validated) return { kind: "resume-complete", upload: validated };

    const imported = matches.find(upload => upload.status === "IMPORTED");
    if (imported) {
        if (imported.calculatedEventListFileId) {
            return {
                kind: "needs-review",
                upload: imported,
                reason: "Upload is IMPORTED but already has calculatedEventListFileId: the calculation committed and was never marked VALIDATED. Re-running would duplicate every calculated event.",
            };
        }
        if (imported.eventListFileId) return { kind: "resume-calculate", upload: imported };
        return {
            kind: "needs-review",
            upload: imported,
            reason: "Upload is IMPORTED but has no eventListFileId: raw data is in DHIS2 with no id list, so it cannot be deleted through the app or resumed. Clean up manually.",
        };
    }

    const uploaded = matches.find(upload => upload.status === "UPLOADED");
    if (uploaded) {
        return { kind: "orphaned-upload", upload: uploaded };
    }

    return { kind: "fresh" };
}

/** Whether an empty or failed submission load should abort the run rather than proceed. */
export function shouldAbortOnSubmissionLoad(result: { failed: boolean; count: number }): boolean {
    return result.failed || result.count === 0;
}

// ---------------------------------------------------------------------------
// Calculation diagnostics
// ---------------------------------------------------------------------------

export type DiagnosticClass =
    /** Known, legitimate non-calculability. Permits SUCCEEDED_WITH_CALCULATION_ISSUES. */
    | "methodological"
    /** Informational; no row was lost. */
    | "benign"
    /** Carries skip/merge counts used for the coverage check. */
    | "rollup"
    /** Known technical / reference-data failure. */
    | "technical"
    /** Unrecognised. Always escalates. */
    | "unknown";

export type CapturedDiagnostic = { content: string; messageType: "Warn" | "Error" };

/**
 * Exact substrings emitted by the AMC calculation code.
 *
 * FRAGILITY, DELIBERATELY ACCEPTED: the calculation utilities expose no structured reason code.
 * Internally every helper returns `{ result, logs }` and the aggregator keeps real counters, but
 * `calculateConsumptionProductLevelData` discards all of it (`logger.batchLog(calculationLogs)`
 * then `return ...result`) and hands back a bare array. Matching text is therefore the only
 * option without changing shared code.
 *
 * Two safeguards make this survivable: anything unmatched classifies as "unknown", which
 * escalates to NEEDS_REVIEW rather than to false success; and these strings are pinned by tests
 * in ./__tests__/amuBulkUploadPolicy.spec.ts.
 *
 * The smallest fix that would remove the fragility is to return `{ result, logs }` from the two
 * top-level calculation functions and thread the logs through the use cases into the summary.
 *
 * NOTE: `messageType` is NOT usable as a severity signal — four of the five "Error" entries below
 * are legitimate methodological exclusions, and one "Warn" ("DDD data found in changes json") is
 * a success message. Classification is by message identity only.
 *
 * NOTE: the source typos "Standarized" and "classsification" are reproduced intentionally.
 */
const DIAGNOSTIC_CATALOGUE: { match: string; class: DiagnosticClass }[] = [
    // --- methodological: the row legitimately cannot be calculated -----------------------
    { match: "- DDD data not found in ddd json of product (atc:", class: "methodological" },
    { match: "- DDD data not found in changes json.", class: "methodological" },
    { match: "- Standarized unit not found in units data for:", class: "methodological" },
    { match: "- Standarized unit not found for ", class: "methodological" },
    { match: "- Content of product cannot be calculated. Strength unit not valid.", class: "methodological" },
    {
        match: "- Combination code not found in combinations json for product with combination code",
        class: "methodological",
    },
    { match: "- Old DDD and new DDD have incompatible units, cannot calculate their ratio.", class: "methodological" },

    // --- benign: informational, no row lost ---------------------------------------------
    { match: "- Could not standardize DDD unit ", class: "benign" },
    { match: "- DDD data found in changes json:", class: "benign" },

    // --- rollup: carries counts ---------------------------------------------------------
    { match: "Aggregation for organisation ", class: "rollup" },
    { match: "End of the calculation of consumption product level data for organisation ", class: "rollup" },
    { match: "End of the calculation of consumption substance level data for organisation ", class: "rollup" },

    // --- technical: a real failure ------------------------------------------------------
    { match: "Atc classsification data is empty or atc version year not found:", class: "technical" },
    { match: "there are no calculated data to import for orgUnitId", class: "technical" },
    { match: "Cannot find upload with id", class: "technical" },
    { match: "Error creating calculations of product level for orgUnitId", class: "technical" },
    { match: "Error creating calculations of substance level for orgUnitId", class: "technical" },
    { match: "Cannot find Raw Substance Consumption Calculated program stage metadata", class: "technical" },
];

/** Classifies a captured diagnostic line by message identity, ignoring its severity. */
export function classifyDiagnostic(content: string): DiagnosticClass {
    return DIAGNOSTIC_CATALOGUE.find(entry => content.includes(entry.match))?.class ?? "unknown";
}

export type SkipRollup = { skippedRows: number };

/**
 * Extracts the number of source rows the calculation dropped, from whichever roll-up line is
 * present. Used only for the coverage check: rows skipped with no methodological diagnostic to
 * account for them means data vanished unexplained.
 */
export function parseSkipRollup(content: string): SkipRollup | undefined {
    if (content.includes("Aggregation for organisation ")) {
        const skips = [...content.matchAll(/(\d+) rows skipped/g)].map(match => Number(match[1]));
        if (skips.length === 0) return undefined;
        return { skippedRows: skips.reduce((sum, value) => sum + value, 0) };
    }

    if (content.includes("End of the calculation of consumption substance level data for organisation ")) {
        const skipped = content.match(/(\d+) skipped \(incompatible DDD units\)/);
        const zeroed = content.match(/(\d+) set to 0 \(no official DDD\)/);
        if (!skipped && !zeroed) return undefined;
        // Zeroed rows are still persisted, so only genuinely skipped rows count as dropped.
        return { skippedRows: Number(skipped?.[1] ?? 0) };
    }

    return undefined;
}

// ---------------------------------------------------------------------------
// Import / calculation verdicts
// ---------------------------------------------------------------------------

export type Verdict =
    | { outcome: "pass" }
    | { outcome: "pass-with-issues"; reason: string }
    | { outcome: "needs-review"; reason: string }
    | { outcome: "fail"; reason: string };

function hasUsableImportCount(summary: ImportSummary): boolean {
    const count = summary?.importCount as ImportSummary["importCount"] | undefined;
    return (
        !!count &&
        [count.imported, count.updated, count.ignored, count.deleted, count.total].every(
            value => typeof value === "number" && Number.isFinite(value)
        )
    );
}

/**
 * Gate for the raw import.
 *
 * `status` and `blockingErrors` are checked independently because they are not mutually
 * exclusive: mapToImportSummary populates blockingErrors from the tracker's errorReports
 * regardless of status, so SUCCESS with blocking errors is representable.
 */
export function evaluateImportSummary(summary: ImportSummary): Verdict {
    if (!summary) return { outcome: "fail", reason: "Import returned no summary" };
    if (summary.status === "ERROR") return { outcome: "fail", reason: "Import status is ERROR" };
    if (summary.blockingErrors?.length > 0) {
        return {
            outcome: "fail",
            reason: `Import returned ${summary.blockingErrors.length} blocking error(s)`,
        };
    }
    if (!hasUsableImportCount(summary)) {
        return { outcome: "fail", reason: "Import summary has a missing or malformed importCount" };
    }
    if (summary.status === "WARNING") {
        return {
            outcome: "pass-with-issues",
            reason: "Import status is WARNING; the event list read-back must confirm the id list was saved",
        };
    }
    return { outcome: "pass" };
}

export type CalculationOutcome =
    | { outcome: "succeeded" }
    | { outcome: "succeeded-with-calculation-issues"; reason: string }
    | { outcome: "needs-review"; reason: string }
    | { outcome: "failed"; reason: string };

/**
 * Classifies the result of a consumption calculation.
 *
 * The distinction this encodes is a GLASS AMU business rule, not a technical one: some source
 * lines legitimately cannot produce calculated output (no applicable DDD or standardized unit),
 * and that is an expected terminal success. What must never be accepted is output going missing
 * for a reason nobody recognised.
 *
 * Key asymmetry: methodologically excluded rows never enter the tracker bundle at all — they
 * shrink `importCount.total` and never appear as `ignored`. So `ignored > 0` can never be
 * methodologically explained; those are records DHIS2 rejected from a bundle that WAS submitted.
 */
export function classifyCalculationOutcome(params: {
    summary: ImportSummary;
    /** The upload record re-read from DHIS2 after the calculation Future resolved. */
    uploadAfterCalc: Pick<GlassUploads, "calculatedEventListFileId">;
    diagnostics: CapturedDiagnostic[];
}): CalculationOutcome {
    const { summary, uploadAfterCalc, diagnostics } = params;

    if (!summary) return { outcome: "failed", reason: "Calculation returned no summary" };

    const classes = diagnostics.map(diagnostic => classifyDiagnostic(diagnostic.content));
    const technical = diagnostics.filter((_, index) => classes[index] === "technical");
    const unknown = diagnostics.filter((_, index) => classes[index] === "unknown");
    const methodological = diagnostics.filter((_, index) => classes[index] === "methodological");

    // --- 1. Technical failure -----------------------------------------------------------
    if (summary.status === "ERROR") {
        // Reached with blockingErrors EMPTY on the "nothing to import" path, where both
        // calculation use cases return status:"ERROR" through Future.success. Checking only
        // blockingErrors (as the script did) let this through as a full success.
        return { outcome: "failed", reason: "Calculation status is ERROR" };
    }
    if (summary.blockingErrors?.length > 0) {
        return {
            outcome: "failed",
            reason: `Calculation returned ${summary.blockingErrors.length} blocking error(s): ${summary.blockingErrors
                .map(error => error.error)
                .join("; ")}`,
        };
    }
    if (!hasUsableImportCount(summary)) {
        return { outcome: "failed", reason: "Calculation summary has a missing or malformed importCount" };
    }
    if (technical.length > 0) {
        return {
            outcome: "failed",
            reason: `Calculation emitted a technical diagnostic: ${technical[0]?.content ?? ""}`,
        };
    }

    const { imported, updated, deleted, ignored, total } = summary.importCount;
    const persisted = imported + updated;

    if (persisted === 0) {
        // `total` counts objects ATTEMPTED, not persisted, so a bundle where everything was
        // rejected reports total: N, ignored: N, imported: 0.
        return {
            outcome: "failed",
            reason: `Calculation persisted no records (imported ${imported}, updated ${updated}, ignored ${ignored}, attempted ${total})`,
        };
    }

    // --- 2. Unexplained or technical partial persistence ---------------------------------
    if (!uploadAfterCalc?.calculatedEventListFileId) {
        return {
            outcome: "needs-review",
            reason: "Calculation persisted records but calculatedEventListFileId was not saved: the calculated events cannot be deleted through the app or safely resumed",
        };
    }
    if (unknown.length > 0) {
        return {
            outcome: "needs-review",
            reason: `Calculation emitted an unrecognised diagnostic, so its impact cannot be assessed: ${
                unknown[0]?.content ?? ""
            }`,
        };
    }
    if (ignored > 0) {
        return {
            outcome: "needs-review",
            reason: `DHIS2 ignored ${ignored} of ${total} submitted calculated records. Methodological exclusions never reach the bundle, so this has no known explanation.`,
        };
    }
    if (persisted + deleted < total) {
        return {
            outcome: "needs-review",
            reason: `Calculated records persisted (${
                persisted + deleted
            }) are fewer than attempted (${total}) with no known explanation`,
        };
    }
    if (summary.status === "WARNING") {
        // Counts reconcile, so the warnings cost nothing. Fall through as an issue, not a review.
        return {
            outcome: "succeeded-with-calculation-issues",
            reason: `Calculation status WARNING but all ${total} attempted records persisted`,
        };
    }

    const droppedRows = diagnostics
        .map(diagnostic => parseSkipRollup(diagnostic.content)?.skippedRows ?? 0)
        .reduce((sum, value) => sum + value, 0);

    if (droppedRows > 0 && methodological.length === 0) {
        return {
            outcome: "needs-review",
            reason: `Calculation reports ${droppedRows} source row(s) skipped but emitted no recognised per-row explanation`,
        };
    }

    // --- 3. Expected, explicitly diagnosed non-calculability ------------------------------
    if (methodological.length > 0) {
        return {
            outcome: "succeeded-with-calculation-issues",
            reason: `${methodological.length} source line(s) legitimately not calculable (no applicable DDD or standardized unit); ${droppedRows} row(s) excluded`,
        };
    }

    return { outcome: "succeeded" };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const MAX_CSV_FIELD_LENGTH = 2000;

/**
 * Bounds a CSV field. `apiToFuture` rejects with `message + stack + JSON.stringify(cause)`, so
 * an untruncated failure reason can be several kilobytes wide. The full text stays in the .txt log.
 */
export function truncateForCsv(text: string | undefined, maxLength = MAX_CSV_FIELD_LENGTH): string | undefined {
    if (text === undefined) return undefined;
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}… [truncated ${text.length - maxLength} chars; see log file]`;
}

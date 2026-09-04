import { ImportSummary } from "../../../domain/entities/data-entry/ImportSummary";
import { DataSubmissionStatusTypes } from "../../../domain/entities/GlassDataSubmission";
import { GlassUploads, GlassUploadsStatus } from "../../../domain/entities/GlassUploads";
import {
    CapturedDiagnostic,
    classifyCalculationOutcome,
    classifyDiagnostic,
    classifyFileState,
    evaluateImportSummary,
    isYearInConfiguredRange,
    parseAmuFileName,
    parseSkipRollup,
    shouldAbortOnSubmissionLoad,
    truncateForCsv,
} from "../amuBulkUploadPolicy";

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function upload(overrides: Partial<GlassUploads> = {}): GlassUploads {
    return {
        id: "upload-1",
        batchId: "",
        countryCode: "ARM",
        fileType: "Product Level Data",
        fileId: "file-1",
        fileName: "product_ARM_2022.xlsx",
        inputLineNb: 0,
        outputLineNb: 0,
        period: "2022",
        specimens: [],
        status: "UPLOADED" as GlassUploadsStatus,
        uploadDate: "2022-01-01T00:00:00.000Z",
        dataSubmission: "submission-1",
        module: "BVnik5xiXGJ",
        orgUnit: "ou-1",
        correspondingRisUploadId: "",
        ...overrides,
    };
}

function summary(overrides: Partial<ImportSummary> = {}): ImportSummary {
    return {
        status: "SUCCESS",
        importCount: { imported: 10, updated: 0, ignored: 0, deleted: 0, total: 10 },
        nonBlockingErrors: [],
        blockingErrors: [],
        ...overrides,
    };
}

const calculated = { calculatedEventListFileId: "calc-file-1" };

function diag(content: string, messageType: "Warn" | "Error" = "Warn"): CapturedDiagnostic {
    return { content, messageType };
}

// Exact strings emitted by the AMC calculation utilities, with the timestamp prefix they carry
// in real runs so the tests exercise substring matching the way production does.
const TS = "[2024-01-01T00:00:00.000Z] ";
const MISSING_DDD = `${TS}Product P1 - DDD data not found in ddd json of product (atc: J01CA04, roa: O, salt: XXXX).`;
const MISSING_UNIT = `${TS}Product P1 - Standarized unit not found in units data for: gram`;
const DDD_FOUND_IN_CHANGES = `${TS}Product P1 - DDD data found in changes json: 1 gram`;
const ROLLUP_AGGREGATION = `${TS}Aggregation for organisation ou-1 and period 2022: 3 rows skipped (product, ddd or ddd_per_pack not found), 2 rows skipped (ddd per product consumption packages could not be calculated), 1 rows merged into an existing aggregate.`;
const TECHNICAL_NO_DATA = `${TS}Product level: there are no calculated data to import for orgUnitId ou-1 and period 2022`;

// ---------------------------------------------------------------------------
// parseAmuFileName
// ---------------------------------------------------------------------------

describe("parseAmuFileName", () => {
    it("accepts a well-formed product filename", () => {
        expect(parseAmuFileName("product_ARM_2022.xlsx")).toEqual({
            kind: "ok",
            fileType: "product",
            orgUnitCode: "ARM",
            period: "2022",
        });
    });

    it("accepts a well-formed substance filename", () => {
        expect(parseAmuFileName("substance_CAN_2023.xlsx")).toEqual({
            kind: "ok",
            fileType: "substance",
            orgUnitCode: "CAN",
            period: "2023",
        });
    });

    it("rejects a capitalised file type rather than treating it as substance", () => {
        const result = parseAmuFileName("Product_ARM_2022.xlsx");
        expect(result.kind).toBe("reject");
        expect((result as { reason: string }).reason).toContain("Invalid file type");
    });

    it("rejects a pluralised file type", () => {
        expect(parseAmuFileName("products_ARM_2022.xlsx").kind).toBe("reject");
    });

    it("ignores Excel lock files", () => {
        expect(parseAmuFileName("~$product_ARM_2022.xlsx").kind).toBe("ignore");
    });

    it("skips known administrative files", () => {
        expect(parseAmuFileName("rename_products.ps1").kind).toBe("skip");
        expect(parseAmuFileName("recoding.log").kind).toBe("skip");
    });

    it("rejects an unsupported extension", () => {
        const result = parseAmuFileName("notes.txt");
        expect(result.kind).toBe("reject");
        expect((result as { reason: string }).reason).toContain("Unsupported extension");
    });

    it("rejects .xls because the import path is xlsx-populate (OOXML only)", () => {
        expect(parseAmuFileName("product_ARM_2022.xls").kind).toBe("reject");
    });

    it("rejects a non-numeric period", () => {
        const result = parseAmuFileName("product_ARM_20XX.xlsx");
        expect(result.kind).toBe("reject");
        expect((result as { reason: string }).reason).toContain("Invalid period");
    });

    it("rejects a filename with no underscore instead of using the whole basename as the period", () => {
        // The old parser did `basename.substring(basename.lastIndexOf("_") + 1)`, which returns
        // the WHOLE basename when there is no underscore — and that value was then used to
        // create a GlassDataSubmission.
        const result = parseAmuFileName("productARM2022.xlsx");
        expect(result.kind).toBe("reject");
        expect(result).not.toHaveProperty("period");
    });
});

// ---------------------------------------------------------------------------
// isYearInConfiguredRange
// ---------------------------------------------------------------------------

describe("isYearInConfiguredRange", () => {
    const currentYear = new Date().getFullYear();

    it("accepts a year inside startPeriod..currentYear-1", () => {
        expect(isYearInConfiguredRange(String(currentYear - 2), { startPeriod: currentYear - 5 })).toBe(true);
    });

    it("rejects a year before startPeriod", () => {
        expect(isYearInConfiguredRange(String(currentYear - 10), { startPeriod: currentYear - 5 })).toBe(false);
    });

    it("rejects a future year", () => {
        expect(isYearInConfiguredRange(String(currentYear + 1), { startPeriod: currentYear - 5 })).toBe(false);
    });

    it("falls back to the last-N-years window when startPeriod is absent", () => {
        expect(isYearInConfiguredRange(String(currentYear - 1), {})).toBe(true);
        expect(isYearInConfiguredRange(String(currentYear - 20), {})).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// classifyFileState — COMPLETED upload against each submission status
// ---------------------------------------------------------------------------

describe("classifyFileState: COMPLETED upload by submission status", () => {
    function classifyCompleted(status: DataSubmissionStatusTypes) {
        return classifyFileState({
            fileType: "product",
            existingUploads: [upload({ status: "COMPLETED" })],
            submission: { status },
        });
    }

    it("treats PENDING_APPROVAL as genuinely complete", () => {
        expect(classifyCompleted("PENDING_APPROVAL").kind).toBe("done");
    });

    it("treats APPROVED as genuinely complete", () => {
        expect(classifyCompleted("APPROVED").kind).toBe("done");
    });

    it("resumes only the PENDING_APPROVAL transition when the submission is COMPLETE", () => {
        const state = classifyCompleted("COMPLETE");
        expect(state.kind).toBe("finalize-submission");
        expect((state as { transitions: string[] }).transitions).toEqual(["PENDING_APPROVAL"]);
    });

    it("runs both transitions when the submission is still NOT_COMPLETED", () => {
        const state = classifyCompleted("NOT_COMPLETED");
        expect(state.kind).toBe("finalize-submission");
        expect((state as { transitions: string[] }).transitions).toEqual(["COMPLETE", "PENDING_APPROVAL"]);
    });

    it.each<DataSubmissionStatusTypes>(["REJECTED", "PENDING_UPDATE_APPROVAL", "UPDATE_REQUEST_ACCEPTED"])(
        "escalates %s rather than overwriting a WHO-side decision",
        status => {
            expect(classifyCompleted(status).kind).toBe("needs-review");
        }
    );
});

// ---------------------------------------------------------------------------
// classifyFileState — other states
// ---------------------------------------------------------------------------

describe("classifyFileState: other upload states", () => {
    const submission = { status: "NOT_COMPLETED" as DataSubmissionStatusTypes };

    function classify(uploads: GlassUploads[]) {
        return classifyFileState({ fileType: "product", existingUploads: uploads, submission });
    }

    it("classifies UPLOADED as an orphan that must not be duplicated", () => {
        const state = classify([upload({ status: "UPLOADED" })]);
        expect(state.kind).toBe("orphaned-upload");
    });

    it("escalates IMPORTED with calculatedEventListFileId instead of recalculating", () => {
        const state = classify([
            upload({ status: "IMPORTED", eventListFileId: "ev-1", calculatedEventListFileId: "calc-1" }),
        ]);
        expect(state.kind).toBe("needs-review");
        expect((state as { reason: string }).reason).toContain("duplicate");
    });

    it("resumes calculation for IMPORTED with only an event list", () => {
        expect(classify([upload({ status: "IMPORTED", eventListFileId: "ev-1" })]).kind).toBe("resume-calculate");
    });

    it("escalates IMPORTED with no event list at all", () => {
        const state = classify([upload({ status: "IMPORTED" })]);
        expect(state.kind).toBe("needs-review");
        expect((state as { reason: string }).reason).toContain("no eventListFileId");
    });

    it("resumes completion for VALIDATED", () => {
        expect(classify([upload({ status: "VALIDATED" })]).kind).toBe("resume-complete");
    });

    it("returns fresh when nothing exists", () => {
        expect(classify([]).kind).toBe("fresh");
    });

    it("ignores DELETED uploads", () => {
        expect(classify([upload({ status: "DELETED" })]).kind).toBe("fresh");
    });
});

// ---------------------------------------------------------------------------
// classifyFileState — opposite file-type conflict
// ---------------------------------------------------------------------------

describe("classifyFileState: opposite file-type conflict", () => {
    const submission = { status: "NOT_COMPLETED" as DataSubmissionStatusTypes };

    function classifySubstanceAgainstProduct(status: GlassUploadsStatus) {
        return classifyFileState({
            fileType: "substance",
            existingUploads: [upload({ fileType: "Product Level Data", status })],
            submission,
        });
    }

    it.each<GlassUploadsStatus>(["COMPLETED", "VALIDATED", "IMPORTED"])(
        "flags a conflict when the opposite type is %s",
        status => {
            const state = classifySubstanceAgainstProduct(status);
            expect(state.kind).toBe("conflict");
            expect((state as { conflicting: GlassUploads }).conflicting.fileType).toBe("Product Level Data");
        }
    );

    it("does not flag a conflict when the opposite type is only UPLOADED", () => {
        expect(classifySubstanceAgainstProduct("UPLOADED").kind).toBe("fresh");
    });

    it("prefers the conflict over a same-type COMPLETED upload", () => {
        const state = classifyFileState({
            fileType: "substance",
            existingUploads: [
                upload({ id: "u-sub", fileType: "Substance Level Data", status: "COMPLETED" }),
                upload({ id: "u-prod", fileType: "Product Level Data", status: "COMPLETED" }),
            ],
            submission: { status: "PENDING_APPROVAL" },
        });
        expect(state.kind).toBe("conflict");
    });

    it("matches the stored UI labels rather than the bare file type", () => {
        const state = classifyFileState({
            fileType: "product",
            existingUploads: [upload({ fileType: "Product Level Data", status: "VALIDATED" })],
            submission,
        });
        expect(state.kind).toBe("resume-complete");
    });
});

// ---------------------------------------------------------------------------
// classifyDiagnostic
// ---------------------------------------------------------------------------

describe("classifyDiagnostic", () => {
    it.each([
        ["missing DDD in ddd json", MISSING_DDD],
        ["missing DDD in changes json", `${TS}Product P1 - DDD data not found in changes json.`],
        ["missing standardized unit in units data", MISSING_UNIT],
        ["missing standardized unit for new DDD", `${TS}Product P1 - Standarized unit not found for gram.`],
        [
            "invalid strength unit",
            `${TS}Product P1 - Content of product cannot be calculated. Strength unit not valid.`,
        ],
        [
            "missing combination code",
            `${TS}Product P1 - Combination code not found in combinations json for product with combination code C1`,
        ],
        [
            "incompatible DDD units",
            `${TS}Substance S1 - Old DDD and new DDD have incompatible units, cannot calculate their ratio.`,
        ],
    ])("classifies %s as methodological", (_label, content) => {
        expect(classifyDiagnostic(content)).toBe("methodological");
    });

    it("classifies the raw-value fallback as benign", () => {
        expect(classifyDiagnostic(`${TS}Product P1 - Could not standardize DDD unit gram. Using raw value.`)).toBe(
            "benign"
        );
    });

    it("classifies the changes-json hit as benign", () => {
        expect(classifyDiagnostic(DDD_FOUND_IN_CHANGES)).toBe("benign");
    });

    it("classifies the aggregation summary as a rollup", () => {
        expect(classifyDiagnostic(ROLLUP_AGGREGATION)).toBe("rollup");
    });

    it("classifies a missing-data error as technical", () => {
        expect(classifyDiagnostic(TECHNICAL_NO_DATA)).toBe("technical");
    });

    it("classifies an unrecognised message as unknown", () => {
        expect(classifyDiagnostic(`${TS}Something nobody has seen before`)).toBe("unknown");
    });

    it("ignores severity: an Error-severity exclusion is still methodological", () => {
        // MISSING_UNIT is emitted with messageType "Error" by the calculation code.
        expect(classifyDiagnostic(MISSING_UNIT)).toBe("methodological");
    });

    it("ignores severity: a Warn-severity success message is still benign", () => {
        // DDD_FOUND_IN_CHANGES is emitted with messageType "Warn" but reports a success.
        expect(classifyDiagnostic(DDD_FOUND_IN_CHANGES)).toBe("benign");
    });
});

// ---------------------------------------------------------------------------
// parseSkipRollup
// ---------------------------------------------------------------------------

describe("parseSkipRollup", () => {
    it("sums both skip counts from the product aggregation line", () => {
        expect(parseSkipRollup(ROLLUP_AGGREGATION)).toEqual({ skippedRows: 5 });
    });

    it("reads only genuinely skipped rows from the substance summary, not zeroed ones", () => {
        const content = `${TS}End of the calculation of consumption substance level data for organisation ou-1 and period 2022: 100 substances processed, 90 copied unchanged (1:1), 5 ratio-adjusted, 3 set to 0 (no official DDD), 2 skipped (incompatible DDD units)`;
        expect(parseSkipRollup(content)).toEqual({ skippedRows: 2 });
    });

    it("returns undefined for a non-rollup line", () => {
        expect(parseSkipRollup(MISSING_DDD)).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// evaluateImportSummary
// ---------------------------------------------------------------------------

describe("evaluateImportSummary", () => {
    it("fails on ERROR", () => {
        expect(evaluateImportSummary(summary({ status: "ERROR" })).outcome).toBe("fail");
    });

    it("fails on blocking errors even when the status is SUCCESS", () => {
        const verdict = evaluateImportSummary(
            summary({ status: "SUCCESS", blockingErrors: [{ error: "bad", count: 1 }] })
        );
        expect(verdict.outcome).toBe("fail");
    });

    it("flags WARNING as needing the event-list read-back", () => {
        expect(evaluateImportSummary(summary({ status: "WARNING" })).outcome).toBe("pass-with-issues");
    });

    it("passes a clean summary", () => {
        expect(evaluateImportSummary(summary()).outcome).toBe("pass");
    });
});

// ---------------------------------------------------------------------------
// classifyCalculationOutcome
// ---------------------------------------------------------------------------

describe("classifyCalculationOutcome", () => {
    function classify(
        summaryOverrides: Partial<ImportSummary>,
        diagnostics: CapturedDiagnostic[] = [],
        uploadAfterCalc: { calculatedEventListFileId?: string } = calculated
    ) {
        return classifyCalculationOutcome({
            summary: summary(summaryOverrides),
            uploadAfterCalc,
            diagnostics,
        });
    }

    it("succeeds on a clean calculation with no diagnostics", () => {
        expect(classify({}).outcome).toBe("succeeded");
    });

    it("is not downgraded by benign or rollup diagnostics alone", () => {
        expect(classify({}, [diag(DDD_FOUND_IN_CHANGES)]).outcome).toBe("succeeded");
    });

    it("returns SUCCEEDED_WITH_CALCULATION_ISSUES for a known missing-DDD diagnostic", () => {
        const result = classify({}, [diag(MISSING_DDD)]);
        expect(result.outcome).toBe("succeeded-with-calculation-issues");
        expect((result as { reason: string }).reason).toContain("not calculable");
    });

    it("returns SUCCEEDED_WITH_CALCULATION_ISSUES for a known missing-standardized-unit diagnostic", () => {
        expect(classify({}, [diag(MISSING_UNIT, "Error")]).outcome).toBe("succeeded-with-calculation-issues");
    });

    it("returns NEEDS_REVIEW for an unknown diagnostic", () => {
        const result = classify({}, [diag(`${TS}Brand new message`)]);
        expect(result.outcome).toBe("needs-review");
        expect((result as { reason: string }).reason).toContain("unrecognised");
    });

    it("returns NEEDS_REVIEW when DHIS2 ignored records, even alongside a methodological diagnostic", () => {
        const result = classify({ importCount: { imported: 8, updated: 0, ignored: 2, deleted: 0, total: 10 } }, [
            diag(MISSING_DDD),
        ]);
        expect(result.outcome).toBe("needs-review");
        expect((result as { reason: string }).reason).toContain("ignored 2");
    });

    it("fails on ERROR status with empty blockingErrors (the silent-success path)", () => {
        const result = classifyCalculationOutcome({
            summary: {
                status: "ERROR",
                importCount: { imported: 0, updated: 0, ignored: 0, deleted: 0, total: 0 },
                nonBlockingErrors: [],
                blockingErrors: [],
            },
            uploadAfterCalc: calculated,
            diagnostics: [],
        });
        expect(result.outcome).toBe("failed");
        expect((result as { reason: string }).reason).toContain("ERROR");
    });

    it("fails when nothing persisted even though records were attempted", () => {
        const result = classify({ importCount: { imported: 0, updated: 0, ignored: 5, deleted: 0, total: 5 } });
        expect(result.outcome).toBe("failed");
        expect((result as { reason: string }).reason).toContain("persisted no records");
    });

    it("fails on blocking errors", () => {
        expect(classify({ blockingErrors: [{ error: "bad", count: 1 }] }).outcome).toBe("failed");
    });

    it("fails on a malformed importCount", () => {
        const result = classifyCalculationOutcome({
            summary: { ...summary(), importCount: undefined as unknown as ImportSummary["importCount"] },
            uploadAfterCalc: calculated,
            diagnostics: [],
        });
        expect(result.outcome).toBe("failed");
        expect((result as { reason: string }).reason).toContain("importCount");
    });

    it("fails when a technical diagnostic is present even if the summary looks clean", () => {
        const result = classify({}, [diag(TECHNICAL_NO_DATA, "Error")]);
        expect(result.outcome).toBe("failed");
        expect((result as { reason: string }).reason).toContain("technical diagnostic");
    });

    it("returns NEEDS_REVIEW when calculatedEventListFileId was not saved", () => {
        const result = classify({}, [], {} as { calculatedEventListFileId?: string });
        expect(result.outcome).toBe("needs-review");
        expect((result as { reason: string }).reason).toContain("calculatedEventListFileId");
    });

    it("accepts WARNING as an issue when every attempted record persisted", () => {
        const result = classify({
            status: "WARNING",
            importCount: { imported: 10, updated: 0, ignored: 0, deleted: 0, total: 10 },
        });
        expect(result.outcome).toBe("succeeded-with-calculation-issues");
    });

    it("returns NEEDS_REVIEW for WARNING with a count shortfall", () => {
        const result = classify({
            status: "WARNING",
            importCount: { imported: 6, updated: 0, ignored: 0, deleted: 0, total: 10 },
        });
        expect(result.outcome).toBe("needs-review");
        expect((result as { reason: string }).reason).toContain("fewer than attempted");
    });

    it("returns NEEDS_REVIEW when rows were skipped with no per-row explanation", () => {
        const result = classify({}, [diag(ROLLUP_AGGREGATION)]);
        expect(result.outcome).toBe("needs-review");
        expect((result as { reason: string }).reason).toContain("no recognised per-row explanation");
    });

    it("accepts skipped rows that are explained by a methodological diagnostic", () => {
        const result = classify({}, [diag(MISSING_DDD), diag(ROLLUP_AGGREGATION)]);
        expect(result.outcome).toBe("succeeded-with-calculation-issues");
        expect((result as { reason: string }).reason).toContain("5 row(s) excluded");
    });
});

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

describe("shouldAbortOnSubmissionLoad", () => {
    it("aborts when the load failed", () => {
        expect(shouldAbortOnSubmissionLoad({ failed: true, count: 0 })).toBe(true);
    });

    it("aborts on an empty but successful load", () => {
        expect(shouldAbortOnSubmissionLoad({ failed: false, count: 0 })).toBe(true);
    });

    it("continues when submissions were loaded", () => {
        expect(shouldAbortOnSubmissionLoad({ failed: false, count: 120 })).toBe(false);
    });
});

describe("truncateForCsv", () => {
    it("truncates a long value and says so", () => {
        const result = truncateForCsv("x".repeat(3000));
        expect(result?.length).toBeLessThan(3000);
        expect(result).toContain("truncated");
    });

    it("leaves a short value untouched", () => {
        expect(truncateForCsv("short")).toBe("short");
    });

    it("passes undefined through", () => {
        expect(truncateForCsv(undefined)).toBeUndefined();
    });
});

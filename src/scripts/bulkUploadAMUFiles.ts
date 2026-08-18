import { D2Api, Id } from "@eyeseetea/d2-api/2.34";
import dotenv from "dotenv";
import { promises as fs } from "node:fs";
import { writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";

import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { DataStoreKeys } from "../data/data-store/DataStoreKeys";
import { GlassDataSubmissionsDefaultRepository } from "../data/repositories/GlassDataSubmissionDefaultRepository";
import { GlassDocumentsDefaultRepository } from "../data/repositories/GlassDocumentsDefaultRepository";
import { GlassModuleDefaultRepository } from "../data/repositories/GlassModuleDefaultRepository";

import { MetadataDefaultRepository } from "../data/repositories/MetadataDefaultRepository";
import { GlassDataSubmission } from "../domain/entities/GlassDataSubmission";
import { GlassUploads } from "../domain/entities/GlassUploads";
import { GlassModuleRepository } from "../domain/repositories/GlassModuleRepository";

import { Semaphore } from "../domain/usecases/data-entry/utils/Semaphore";
import { GetSpecificDataSubmissionUseCase } from "../domain/usecases/GetSpecificDataSubmissionUseCase";
import { SaveDataSubmissionsUseCase } from "../domain/usecases/SaveDataSubmissionsUseCase";
import { SetDataSubmissionStatusUseCase } from "../domain/usecases/SetDataSubmissionStatusUseCase";
import { SetUploadStatusUseCase } from "../domain/usecases/SetUploadStatusUseCase";

import { generateUid } from "../utils/uid";
import { setupConsoleLogger, logger, BatchLogContent } from "../utils/logger";
import { getInstance, warmUpSession } from "./common";
import { GlassUploadsProgramRepository } from "../data/repositories/GlassUploadsProgramRepository";
import { getUploadsFormDataBuilder } from "../utils/getUploadsFormDataBuilder";
import { getD2APiFromInstance } from "../utils/d2-api";
import { AMCProductDataDefaultRepository } from "../data/repositories/data-entry/AMCProductDataDefaultRepository";
import { AMCSubstanceDataDefaultRepository } from "../data/repositories/data-entry/AMCSubstanceDataDefaultRepository";
import { ImportAMCProductLevelData } from "../domain/usecases/data-entry/amc/ImportAMCProductLevelData";
import { ImportAMCSubstanceLevelData } from "../domain/usecases/data-entry/amc/ImportAMCSubstanceLevelData";
import { ExcelRepository } from "../domain/repositories/ExcelRepository";
import { InstanceRepository } from "../domain/repositories/InstanceRepository";
import { TrackerRepository } from "../domain/repositories/TrackerRepository";
import { ProgramRulesMetadataRepository } from "../domain/repositories/program-rules/ProgramRulesMetadataRepository";
import { GlassATCRepository } from "../domain/repositories/GlassATCRepository";
import { ExcelPopulateDefaultRepository } from "../data/repositories/ExcelPopulateDefaultRepository";
import { GlassATCDefaultRepository } from "../data/repositories/GlassATCDefaultRepository";
import { TrackerDefaultRepository } from "../data/repositories/TrackerDefaultRepository";
import { InstanceDefaultRepository } from "../data/repositories/InstanceDefaultRepository";
import { ProgramRulesMetadataDefaultRepository } from "../data/repositories/program-rule/ProgramRulesMetadataDefaultRepository";
import { Dhis2EventsDefaultRepository } from "../data/repositories/Dhis2EventsDefaultRepository";
import { CountryDefaultRepository } from "../data/repositories/CountryDefaultRepository";
import { CalculateConsumptionDataProductLevelUseCase } from "../domain/usecases/data-entry/amc/CalculateConsumptionDataProductLevelUseCase";
import { CalculateConsumptionDataSubstanceLevelUseCase } from "../domain/usecases/data-entry/amc/CalculateConsumptionDataSubstanceLevelUseCase";
import { Country } from "../domain/entities/Country";
import { Future, FutureData } from "../domain/entities/Future";
import {
    AmuFileType,
    CapturedDiagnostic,
    classifyCalculationOutcome,
    classifyDiagnostic,
    classifyFileState,
    DiagnosticClass,
    evaluateImportSummary,
    FILE_TYPE_LABELS,
    FileState,
    isYearInConfiguredRange,
    parseAmuFileName,
    shouldAbortOnSubmissionLoad,
    SubmissionTransition,
    truncateForCsv,
} from "./utils/amuBulkUploadPolicy";

dotenv.config();
console.log("REACT_APP_DHIS2_BASE_URL:", process.env.REACT_APP_DHIS2_BASE_URL);

let dataStoreClient: DataStoreClient;
let metadataRepository: MetadataDefaultRepository;
let amcProductDataRepository: AMCProductDataDefaultRepository;
let glassDocumentsRepository: GlassDocumentsDefaultRepository;
let glassUploadsRepository: GlassUploadsProgramRepository;
let amcSubstanceDataRepository: AMCSubstanceDataDefaultRepository;
let setUploadStatusUseCase: SetUploadStatusUseCase;
let getSpecificDataSubmission: GetSpecificDataSubmissionUseCase;
let saveDataSubmissions: SaveDataSubmissionsUseCase;
let setSubmissionStatus: SetDataSubmissionStatusUseCase;
let glassDataSubmissionRepository: GlassDataSubmissionsDefaultRepository;
let moduleRepository: GlassModuleRepository;
let excelRepository: ExcelRepository;
let instanceRepository: InstanceRepository;
let trackerRepository: TrackerRepository;
let programRulesMetadataRepository: ProgramRulesMetadataRepository;
let atcRepository: GlassATCRepository;
let dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository;
let countryRepository: CountryDefaultRepository;
let consumptionDataProductLevel: CalculateConsumptionDataProductLevelUseCase;
let consumptionDataSubstanceLevel: CalculateConsumptionDataSubstanceLevelUseCase;

const moduleName = "AMC";
const moduleId = "BVnik5xiXGJ";
const CREATE_AND_UPDATE = "CREATE_AND_UPDATE";
const datastore_semaphore = new Semaphore(1);
const dataValues_semaphore = new Semaphore(1);
const batch_semaphore = new Semaphore(1);
let authPromise: Promise<void> | null = null;

let orgUnits: { [key: string]: string } = {};
let orgUnitNames: { [key: string]: string } = {};
let allDataSubmissions = new Map<string, GlassDataSubmission>();
let allCountries: Country[] = [];
// Period bounds the application itself considers valid, read once from the AMC module config.
let amcModuleConfig: { startPeriod?: number; populateCurrentYearInHistory?: boolean } | undefined;

// Per-run outcome report so a single bad file never aborts the batch.
const processingResults = {
    succeeded: [] as string[],
    succeededWithIssues: [] as string[],
    skipped: [] as string[],
    failed: [] as string[],
    // Files that were NOT progressed because doing so safely needs a human decision — an
    // opposite-file-type conflict, a calculation whose shortfall has no known explanation, an
    // orphaned upload record. Kept apart from `failed` because re-running will not fix them.
    needsReview: [] as string[],
};

// Tracks which processing phase is currently running for the file being processed, and how many
// calculation/upload diagnostics (DDD-not-found, unit-not-found, non-blocking import errors, etc.)
// were captured for it. Attribution relies on serial processing (batch_semaphore size 1 + the
// awaited for-loop in processDirectory) — if concurrency is ever introduced, each concurrent file
// needs its own phase marker and counters instead of this shared module-level state.
type ProcessingPhase = "UPLOAD" | "CALCULATION";
let currentPhase: ProcessingPhase = "UPLOAD";
function newDiagnosticsBucket() {
    return { entries: [] as CapturedDiagnostic[] };
}
let currentFileDiagnostics = {
    upload: newDiagnosticsBucket(),
    calc: newDiagnosticsBucket(),
};

// Counts are derived from the diagnostic CLASS, not from the logger's messageType. The
// calculation code emits legitimate methodological exclusions at "Error" severity and at least
// one success message at "Warn" severity, so tallying by messageType (as this script used to)
// made every healthy product file report calculation "errors".
function summariseBucket(bucket: { entries: CapturedDiagnostic[] }) {
    const counts: Record<DiagnosticClass, number> = {
        methodological: 0,
        benign: 0,
        rollup: 0,
        technical: 0,
        unknown: 0,
    };
    bucket.entries.forEach(entry => {
        counts[classifyDiagnostic(entry.content)]++;
    });
    return {
        // "Warnings" = expected, explained exclusions. "Errors" = things nobody recognised or
        // that failed technically. Rollup/benign lines are informational and counted in neither.
        warnings: counts.methodological,
        errors: counts.technical + counts.unknown,
        counts,
        messages: bucket.entries.map(entry => `[${classifyDiagnostic(entry.content).toUpperCase()}] ${entry.content}`),
    };
}
let api!: D2Api;

// Durable, incremental reporting: both files are appended to SYNCHRONOUSLY, immediately, as events
// happen. A long run can be killed (Ctrl+C, taskkill, terminal closed) at any point — since nothing
// is buffered in memory waiting for a final write, everything processed so far is already on disk.
const runTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logFilePath = path.join(process.cwd(), `AMU_upload_log_${runTimestamp}.txt`);
const progressFilePath = path.join(process.cwd(), `AMU_upload_progress_${runTimestamp}.csv`);
writeFileSync(
    progressFilePath,
    "timestamp,orgUnitCode,period,fileType,fileName,outcome,durationSeconds,uploadWarnCount,uploadErrorCount,uploadIssueDetails,calcWarnCount,calcErrorCount,calcIssueDetails,succeeded,failed,needsReview,skipped,reason\n"
);

function csvField(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
}

// Renders a millisecond duration as "Xm Ys" (or just "Ys" under a minute) for log messages.
function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

// A file whose DHIS2 import succeeded is never reclassified as FAILED because of calculation/upload
// diagnostics (a product legitimately lacking a DDD is expected, and the UI also completes these
// files) — instead the phase that raised a diagnostic is baked directly into the outcome status.
type OutcomeStatus =
    | "SUCCEEDED"
    | "SUCCEEDED_WITH_UPLOAD_ISSUES"
    | "SUCCEEDED_WITH_CALCULATION_ISSUES"
    | "SUCCEEDED_WITH_UPLOAD_AND_CALCULATION_ISSUES"
    | "FAILED"
    | "NEEDS_REVIEW"
    | "SKIPPED";

const SUCCESS_OUTCOMES: OutcomeStatus[] = [
    "SUCCEEDED",
    "SUCCEEDED_WITH_UPLOAD_ISSUES",
    "SUCCEEDED_WITH_CALCULATION_ISSUES",
    "SUCCEEDED_WITH_UPLOAD_AND_CALCULATION_ISSUES",
];

// Appends one line per file outcome to the progress CSV, immediately, with a running tally.
// This is the authoritative "how many were correctly uploaded" report for the run.
function recordOutcome(
    outcome: OutcomeStatus,
    fileName: string,
    detail: {
        orgUnitCode?: string;
        period?: string;
        fileType?: string;
        reason?: string;
        durationSeconds?: number;
        uploadWarnCount?: number;
        uploadErrorCount?: number;
        uploadIssueDetails?: string;
        calcWarnCount?: number;
        calcErrorCount?: number;
        calcIssueDetails?: string;
    } = {}
): void {
    if (outcome === "FAILED") processingResults.failed.push(fileName);
    if (outcome === "NEEDS_REVIEW") processingResults.needsReview.push(fileName);
    if (outcome === "SKIPPED") processingResults.skipped.push(fileName);
    if (SUCCESS_OUTCOMES.includes(outcome)) {
        processingResults.succeeded.push(fileName);
        if (outcome !== "SUCCEEDED") processingResults.succeededWithIssues.push(fileName);
    }

    const row = [
        new Date().toISOString(),
        detail.orgUnitCode ?? "",
        detail.period ?? "",
        detail.fileType ?? "",
        fileName,
        outcome,
        detail.durationSeconds !== undefined ? String(detail.durationSeconds) : "",
        detail.uploadWarnCount !== undefined ? String(detail.uploadWarnCount) : "",
        detail.uploadErrorCount !== undefined ? String(detail.uploadErrorCount) : "",
        truncateForCsv(detail.uploadIssueDetails) ?? "",
        detail.calcWarnCount !== undefined ? String(detail.calcWarnCount) : "",
        detail.calcErrorCount !== undefined ? String(detail.calcErrorCount) : "",
        truncateForCsv(detail.calcIssueDetails) ?? "",
        String(processingResults.succeeded.length),
        String(processingResults.failed.length),
        String(processingResults.needsReview.length),
        String(processingResults.skipped.length),
        // Bounded: apiToFuture rejects with `message + stack + JSON.stringify(cause)`, which can
        // be several kilobytes. The full text is always in the .txt log.
        truncateForCsv(detail.reason) ?? "",
    ]
        .map(csvField)
        .join(",");

    appendFileSync(progressFilePath, row + "\n");
}

interface FileMetaData {
    fileUploadId: string;
    fileId: string;
    // Narrowed to the union (rather than `string`) so the `product ? … : substance` branches in
    // validateFile/uploadDataValues are exhaustive at the type level. Previously any filename
    // that did not start with `product_` fell through to the substance path silently.
    fileType: AmuFileType;
    fileBuffer: BufferFile;
    fileData: FileData;
    fileName: string;
    batchMetaData: BatchMetaData;
}

interface FileData {
    isValid: boolean;
    rows: number;
    specimens: string[];
}
interface BatchMetaData {
    orgUnitCode: string;
    orgUnitName: string;
    batchId: string;
    dataSubmission: GlassDataSubmission;
    existingUploads: GlassUploads[];
}

/**
 * The AMC import/calculation use cases create Blob/File objects (for the event-id list files) and
 * build multipart uploads with FormData. Node 16 has none of these as globals, so provide them from
 * formdata-node. Using the AsBuffer import variants means no localStorage shim is needed.
 */
async function setupNodeGlobals(): Promise<void> {
    const g = globalThis as any;

    if (typeof g.Blob !== "function" || typeof g.File !== "function" || typeof g.FormData !== "function") {
        const { Blob: PBlob, File: PFile, FormData: PFormData } = await import("formdata-node");
        if (typeof g.Blob !== "function") g.Blob = PBlob;
        if (typeof g.File !== "function") g.File = PFile;
        if (typeof g.FormData !== "function") g.FormData = PFormData;
    }

    // Some shared use cases (e.g. CustomValidationForEventProgram) reference lodash as a global `_`
    // without importing it — this works in the browser bundle but not in Node. Provide it globally.
    if (typeof g._ === "undefined") {
        const lodashModule = await import("lodash");
        g._ = (lodashModule as any).default ?? lodashModule;
    }
}

function getUploadFileTypeLabel(fileType: AmuFileType): string {
    // Match the labels the UI stores on the upload record (moduleProperties primary/secondary
    // file types) so downstream dashboards and filters see identical data.
    return FILE_TYPE_LABELS[fileType];
}

function getEnvVars() {
    if (!process.env.REACT_APP_DHIS2_BASE_URL)
        throw new Error("REACT_APP_DHIS2_BASE_URL  must be set in the .env file");

    console.log("REACT_APP_DHIS2_BASE_URL:", process.env.REACT_APP_DHIS2_BASE_URL);

    const token =
        process.env.REACT_APP_DHIS2_TOKEN_PROD ||
        process.env.REACT_APP_DHIS2_TOKEN_PREPROD ||
        process.env.REACT_APP_DHIS2_TOKEN_TRAINING ||
        process.env.REACT_APP_DHIS2_TOKEN;

    if (!token && !process.env.REACT_APP_DHIS2_AUTH)
        throw new Error(
            "Either REACT_APP_DHIS2_TOKEN_PROD, REACT_APP_DHIS2_TOKEN, or REACT_APP_DHIS2_AUTH must be set in the .env file"
        );

    const envVars = token
        ? { url: process.env.REACT_APP_DHIS2_BASE_URL, token }
        : (() => {
              const auth = process.env.REACT_APP_DHIS2_AUTH!;
              const username = auth.split(":")[0] ?? "";
              const password = auth.split(":")[1] ?? "";
              if (!username || !password)
                  throw new Error("REACT_APP_DHIS2_AUTH must be in the format 'username:password'");
              return { url: process.env.REACT_APP_DHIS2_BASE_URL, auth: { username, password } };
          })();

    return envVars;
}

// Memoizes a repository method that returns FutureData, by resolved value (not by Future reference —
// fluture Futures are cold and re-run their computation, including the underlying HTTP fetch, on every
// fork/toPromise, so caching the Future object alone does not prevent repeat network calls). Used only
// to wrap static reference-data fetches (program metadata, ATC versions, module config, program rules)
// that are identical across every file in a run. A failed fetch is evicted so the next file retries
// instead of replaying the same error for the rest of the run.
function memoizeFutureData<Args extends unknown[], T>(
    fn: (...args: Args) => FutureData<T>
): (...args: Args) => FutureData<T> {
    const promises = new Map<string, Promise<T>>();
    return (...args: Args) => {
        const key = JSON.stringify(args);
        const existing = promises.get(key);
        const promise = existing ?? fn(...args).toPromise();
        if (!existing) {
            promises.set(key, promise);
            promise.catch(() => promises.delete(key));
        }
        return Future.fromComputation<string, T>((resolve, reject) => {
            promise.then(resolve, reject);
            return () => {};
        });
    };
}

async function initializeGlobals() {
    const startTime = Date.now();
    const envVars = getEnvVars();
    const instance = getInstance(envVars);
    api = getD2APiFromInstance(instance);
    await warmUpSession(api);
    // The AMC calculation use cases log via the shared `logger`, which is undefined until a setup
    // function runs. Initialize a console logger (as the AMC CLI scripts do) before any use case runs.
    await setupConsoleLogger({ isDebug: false });
    instrumentLoggerForDurableCapture();
    const runtime: "node" | "browser" = typeof window === "undefined" ? "node" : "browser";
    const uploadsFormDataBuilder = getUploadsFormDataBuilder(runtime);

    //DataStore
    dataStoreClient = new DataStoreClient(undefined, api);
    glassDocumentsRepository = new GlassDocumentsDefaultRepository(dataStoreClient, instance);
    glassUploadsRepository = new GlassUploadsProgramRepository(api, uploadsFormDataBuilder);
    moduleRepository = new GlassModuleDefaultRepository(dataStoreClient);
    glassDataSubmissionRepository = new GlassDataSubmissionsDefaultRepository(dataStoreClient);
    setUploadStatusUseCase = new SetUploadStatusUseCase(glassUploadsRepository);
    getSpecificDataSubmission = new GetSpecificDataSubmissionUseCase(glassDataSubmissionRepository);
    setSubmissionStatus = new SetDataSubmissionStatusUseCase(glassDataSubmissionRepository);
    saveDataSubmissions = new SaveDataSubmissionsUseCase(glassDataSubmissionRepository);

    //DHIS2 backend (Do these have a shared authentication session?)
    metadataRepository = new MetadataDefaultRepository(undefined, api);

    //Reads the files
    amcProductDataRepository = new AMCProductDataDefaultRepository(api);
    amcSubstanceDataRepository = new AMCSubstanceDataDefaultRepository(api);

    excelRepository = new ExcelPopulateDefaultRepository();
    instanceRepository = new InstanceDefaultRepository(instance, dataStoreClient);
    trackerRepository = new TrackerDefaultRepository(instance);
    programRulesMetadataRepository = new ProgramRulesMetadataDefaultRepository(instance);
    atcRepository = new GlassATCDefaultRepository(dataStoreClient);
    dhis2EventsDefaultRepository = new Dhis2EventsDefaultRepository(instance);
    countryRepository = new CountryDefaultRepository(api);

    // Wrap static reference-data fetches (identical for every file in this run) so they hit the
    // network once instead of once per file. See memoizeFutureData for why plain @cache() on the
    // repository methods would not have worked (Futures are cold and re-fetch on every fork).
    trackerRepository.getProgramMetadata = memoizeFutureData(
        trackerRepository.getProgramMetadata.bind(trackerRepository)
    );
    amcProductDataRepository.getProductRegisterProgramMetadata = memoizeFutureData(
        amcProductDataRepository.getProductRegisterProgramMetadata.bind(amcProductDataRepository)
    );
    atcRepository.getAtcHistory = memoizeFutureData(atcRepository.getAtcHistory.bind(atcRepository));
    atcRepository.getAtcVersion = memoizeFutureData(atcRepository.getAtcVersion.bind(atcRepository));
    moduleRepository.getByName = memoizeFutureData(moduleRepository.getByName.bind(moduleRepository));
    programRulesMetadataRepository.getMetadata = memoizeFutureData(
        programRulesMetadataRepository.getMetadata.bind(programRulesMetadataRepository)
    );

    consumptionDataProductLevel = new CalculateConsumptionDataProductLevelUseCase(
        excelRepository,
        instanceRepository,
        amcProductDataRepository,
        atcRepository,
        metadataRepository,
        moduleRepository,
        amcSubstanceDataRepository,
        glassUploadsRepository,
        glassDocumentsRepository
    );
    consumptionDataSubstanceLevel = new CalculateConsumptionDataSubstanceLevelUseCase(
        glassUploadsRepository,
        glassDocumentsRepository,
        amcSubstanceDataRepository,
        atcRepository,
        metadataRepository,
        moduleRepository
    );

    //held in memory so need to check resources available to script
    //Existing uploads are queried per-submission (from the Tracker program) when each file is
    //processed, matching how the app reads them; no need to preload all uploads here.
    [allDataSubmissions, , allCountries] = await Promise.all([
        initializDataSubmissions(),
        initializeOrgUnits(),
        countryRepository.getAll().toPromise(),
    ]);

    // Nothing may run against an unverified picture of what already exists. A failed or empty
    // submission load previously produced an empty map and the run continued, so EVERY file
    // missed the lookup and entered the submission-creation branch.
    if (shouldAbortOnSubmissionLoad({ failed: dataSubmissionsLoadFailed, count: allDataSubmissions.size })) {
        throw new Error(
            dataSubmissionsLoadFailed
                ? "Could not load existing AMC data submissions. Aborting: without them the script cannot tell what has already been uploaded."
                : `Loaded 0 AMC data submissions for module ${moduleId}. Aborting: this usually means the wrong server, the wrong module id, or an org-unit-scoped account.`
        );
    }

    await assertModuleConfigured();

    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    log(`Initialization done in ${elapsedSeconds} seconds`);
}

// The column lists drive file validation, and `_.every([], …)` is vacuously true — so a missing
// config would silently make every file "valid". The UI hard-errors in the same situation. Checked
// once here rather than per file because getByName is memoized for the whole run.
async function assertModuleConfigured(): Promise<void> {
    const module = await moduleRepository.getByName(moduleName).toPromise();
    if (!module) throw new Error(`Module '${moduleName}' does not exist`);

    const missing = [
        !module.dataColumns?.length && "dataColumns",
        !module.teiColumns?.length && "teiColumns",
        !module.rawSubstanceDataColumns?.length && "rawSubstanceDataColumns",
    ].filter(Boolean);

    if (missing.length > 0) {
        throw new Error(
            `AMC module config is missing ${missing.join(", ")}. File validation would pass unconditionally. Aborting.`
        );
    }

    amcModuleConfig = {
        startPeriod: module.startPeriod,
        populateCurrentYearInHistory: module.populateCurrentYearInHistory,
    };
}

/*
================================================================
Logging logic. Override console logs to put timestamps
================================================================
*/

function getTimestamp(): string {
    const now = new Date();
    return now.toLocaleString();
}

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;

console.log = (...args: any[]) => {
    originalLog(`[${getTimestamp()}]`, ...args);
};

console.error = (...args: any[]) => {
    originalError(`[${getTimestamp()}]`, ...args);
};

console.warn = (...args: any[]) => {
    originalWarn(`[${getTimestamp()}]`, ...args);
};

console.info = (...args: any[]) => {
    originalInfo(`[${getTimestamp()}]`, ...args);
};

enum LogLevel {
    INFO = "info",
    WARN = "warn",
    ERROR = "error",
}

function log(message: string, level = "info") {
    switch (level) {
        case LogLevel.ERROR:
            console.error(`[ERROR] ${message}`);
            break;
        case LogLevel.WARN:
            console.warn(`[WARN] ${message}`);
            break;
        case LogLevel.INFO:
        default:
            console.log(`[INFO] ${message}`);
            break;
    }

    if (message) {
        // Appended immediately (not buffered) so the log file reflects everything processed so far
        // even if the process is killed mid-run.
        appendFileSync(logFilePath, `[${getTimestamp()}] [${level.toUpperCase()}] ${message}\n`);
    } else {
        console.error("Attempted to add an empty message.");
    }
}

function diagnosticsBucketFor(phase: ProcessingPhase) {
    return phase === "UPLOAD" ? currentFileDiagnostics.upload : currentFileDiagnostics.calc;
}

// Writes one diagnostic line verbatim to the durable log file, tagged with the phase it occurred in
// and its severity, and tallies + stores it (in currentFileDiagnostics) for the CSV outcome columns —
// both the warn/error counts and the full message text (surfaced via the CSV's own
// uploadIssueDetails/calcIssueDetails columns, so the common case doesn't require opening the .txt
// log). The phase tag is kept in the log line (which interleaves both phases chronologically) but
// dropped from the bucket message, since which column it lands in already tells you the phase.
function captureDiagnosticLine(content: string, phase: ProcessingPhase, messageType: "Warn" | "Error"): void {
    const bucket = diagnosticsBucketFor(phase);
    bucket.entries.push({ content, messageType });
    // The log line carries the diagnostic CLASS rather than the logger's severity, because the
    // two disagree: methodological exclusions are emitted as "Error" and at least one success
    // message is emitted as "Warn". Severity is kept alongside it for traceability.
    const diagnosticClass = classifyDiagnostic(content).toUpperCase();
    appendFileSync(
        logFilePath,
        `[${getTimestamp()}] [${phase}][${diagnosticClass}/${messageType.toUpperCase()}] ${content}\n`
    );
}

type ConsistencyErrorLike = { error: string; count: number; lines?: number[] };

// Renders a structured ConsistencyError as one readable line — never JSON.stringify — so the log
// file stays human-readable.
function formatConsistencyError(entry: ConsistencyErrorLike): string {
    const linesSuffix = entry.lines && entry.lines.length > 0 ? `, lines: ${entry.lines.join(",")}` : "";
    return `${entry.error} (count: ${entry.count}${linesSuffix})`;
}

// Captures the structured blocking/non-blocking errors from an ImportSummary/calculation summary
// (as opposed to the free-form logger diagnostics captured by instrumentLoggerForDurableCapture)
// into the same durable, phase-tagged log + counters.
function captureConsistencyErrors(
    entries: ConsistencyErrorLike[] | undefined,
    fileName: string,
    phase: ProcessingPhase,
    messageType: "Warn" | "Error"
): void {
    (entries ?? []).forEach(entry => {
        captureDiagnosticLine(`(${fileName}) ${formatConsistencyError(entry)}`, phase, messageType);
    });
}

// The AMC calculation use cases (CalculateConsumptionDataProductLevelUseCase / ...SubstanceLevel...)
// emit free-form diagnostics — e.g. "DDD data not found", "Standarized unit not found" — via the
// shared `logger`. The console logger's batchLog/warn/error write straight to process.stderr and
// bypass this script's own console.* overrides entirely, so those diagnostics were reaching only the
// terminal and never the durable log/CSV — even though the affected product is silently excluded
// from the calculated output. This wraps the shared logger singleton's methods (mutating the object
// in place, so every module holding a reference to it — including the calculation use cases — is
// affected) so every warn/error/batchLog entry is also written verbatim to the durable log file,
// tagged with whichever processing phase is currently running, and tallied for the CSV outcome
// columns. info/success/debug are left unwrapped (routine progress; avoids noise).
// MUST run AFTER setupConsoleLogger (which reassigns the `logger` binding) and is NOT idempotent
// — calling it twice double-captures every message.
function instrumentLoggerForDurableCapture(): void {
    const target = logger as unknown as {
        warn: (content: string) => Promise<void>;
        error: (content: string) => Promise<void>;
        success: (content: string) => Promise<void>;
        batchLog: (content: BatchLogContent) => Promise<void>;
    };
    const originalWarn = target.warn.bind(target);
    const originalError = target.error.bind(target);
    const originalSuccess = target.success.bind(target);
    const originalBatchLog = target.batchLog.bind(target);

    // The two calculation roll-up lines carrying the skipped-row counts are emitted via
    // logger.success, so without this they never reach the policy and the "was every excluded
    // row explained?" check cannot run. Filtered to those lines only — routine successes would
    // otherwise flood the CSV.
    target.success = (content: string) => {
        if (content.includes("End of the calculation of consumption")) {
            captureDiagnosticLine(content, currentPhase, "Warn");
        }
        return originalSuccess(content);
    };

    target.warn = (content: string) => {
        captureDiagnosticLine(content, currentPhase, "Warn");
        return originalWarn(content);
    };
    target.error = (content: string) => {
        captureDiagnosticLine(content, currentPhase, "Error");
        return originalError(content);
    };
    target.batchLog = (content: BatchLogContent) => {
        const phase = currentPhase;
        content.forEach(entry => {
            if (entry.messageType === "Warn" || entry.messageType === "Error") {
                captureDiagnosticLine(entry.content, phase, entry.messageType);
            }
        });
        return originalBatchLog(content);
    };
}

/*
================================================================
HELPER FUNCTIONS AND UTILS (PERHAPS COULD GO INTO ANOTHER FILE)
================================================================
*/

let lastAuthTime: number | null = null;
const AUTH_COOLDOWN_PERIOD = 60000; // never refresh the session more than once per minute
const AUTH_HEARTBEAT_INTERVAL = 10 * 60 * 1000; // proactively refresh the session every 10 minutes

// Set when a session refresh fails with an auth error (401/403). Signals the token is expired/revoked,
// so the run aborts instead of burning through the remaining files as failures.
let fatalAuthErrorMessage: string | null = null;

function isAuthError(error: unknown): boolean {
    const text = (error instanceof Error ? error.message : String(error)).toLowerCase();
    return text.includes("401") || text.includes("403") || text.includes("unauthorized") || text.includes("forbidden");
}

// Refresh the DHIS2 session (GET /me). Used both by the retry logic (on repeated failures / Bad
// Gateway, often a dropped session) and by a periodic heartbeat. Coordinated so only one refresh runs
// at a time and not more often than the cooldown. NOTE: with a Personal Access Token the token is sent
// on every request and does not expire per-request — this keeps the server-side session warm and
// recovers a dropped session; it cannot rescue a token that has itself expired or been revoked.
async function reauthenticate(reason: string): Promise<void> {
    const now = Date.now();
    if (lastAuthTime && now - lastAuthTime < AUTH_COOLDOWN_PERIOD) return; // refreshed very recently
    if (authPromise) {
        await authPromise; // a refresh is already in progress
        return;
    }
    authPromise = warmUpSession(api);
    try {
        await authPromise;
        lastAuthTime = Date.now();
        console.info(`Session refreshed (${reason})`);
    } catch (authError) {
        const message = authError instanceof Error ? authError.message : String(authError);
        log(`Session refresh failed (${reason}): ${message}`, LogLevel.WARN);
        if (isAuthError(authError)) {
            fatalAuthErrorMessage = `Authentication failed during session refresh (${reason}): ${message}. The token is likely expired or revoked — aborting the run so the remaining files are not wasted.`;
        }
    } finally {
        authPromise = null;
    }
}

async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries = 6,
    delay = 1000,
    maxDelay = 10000
): Promise<T> {
    let attempt = 1;
    while (attempt <= maxRetries) {
        try {
            return await operation();
        } catch (error: any) {
            const errorText = error instanceof Error ? error.message : String(error);

            if (errorText.includes("Import Ignored")) {
                console.warn("The server returned Import Ignored. No reason to retry.");
                log(errorText, LogLevel.ERROR);
                break;
            }

            if (attempt === maxRetries) {
                throw new Error(`Failed after ${maxRetries} retries: ${errorText}`);
            }

            // Refresh the session on repeated failures or a Bad Gateway (commonly a dropped session).
            if (attempt === Math.floor(maxRetries / 2) || errorText.includes("Bad Gateway")) {
                await reauthenticate("retry");
                // If the refresh proved the token is dead, stop retrying this operation immediately.
                if (fatalAuthErrorMessage) throw new Error(fatalAuthErrorMessage);
            }

            // Recorded to the log file so we can see, after the fact, WHAT was causing retries.
            const backoffDelay = Math.min(delay * Math.pow(2, attempt - 1), maxDelay);
            log(`Retry ${attempt}/${maxRetries} in ${backoffDelay}ms after error: ${errorText}`, LogLevel.WARN);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));

            attempt++;
        }
    }
    throw new Error(`Failed to complete operation after ${maxRetries} retries`);
}

async function initializeOrgUnits() {
    const orgUnitsObject = await api.models.organisationUnits
        .get({
            fields: { id: true, name: true, code: true },
            filter: { level: { eq: "3" } },
            paging: false,
        })
        .getData()
        .catch(error => {
            console.error(`Error thrown when fetching countries : ${error}`);
            throw error;
        });

    //2.b) Add Kosovo to the list of countries
    orgUnitsObject.objects.push({
        id: "I8AMbKhxlj9",
        name: "Kosovo",
        code: "601624",
    });

    //held in memory so need to check resources available to script
    orgUnits = orgUnitsObject.objects.reduce<{ [key: string]: string }>((map, ou) => {
        map[ou.code] = ou.id;
        return map;
    }, {});

    orgUnitNames = orgUnitsObject.objects.reduce<{ [key: string]: string }>((map, ou) => {
        map[ou.code] = ou.name;
        return map;
    }, {});
}

// Set when the submission load fails. The failure is recorded rather than thrown here so the
// caller can report it alongside the empty-result case, but it MUST abort the run: an empty map
// is indistinguishable from "nothing has been uploaded yet" and would make the script re-upload
// everything and create submissions for country-years that already have them.
let dataSubmissionsLoadFailed = false;

async function initializDataSubmissions(): Promise<Map<string, GlassDataSubmission>> {
    const allDataSubmissions = new Map<string, GlassDataSubmission>();
    try {
        const dataSubmissionObjects: GlassDataSubmission[] = await dataStoreClient
            .getObjectsFilteredByProps<GlassDataSubmission>(
                DataStoreKeys.DATA_SUBMISSIONS,
                new Map<keyof GlassDataSubmission, unknown>([["module", moduleId]])
            )
            .toPromise();

        if (dataSubmissionObjects && dataSubmissionObjects.length > 0) {
            // GetSpecificDataSubmissionUseCase blind-appends a new submission whenever the match
            // count is not exactly 1, so duplicates can accumulate. They are reported here because
            // readSubmission refuses to guess which one is authoritative, which would otherwise
            // surface as a confusing per-file failure much later in the run.
            const duplicates: string[] = [];
            dataSubmissionObjects.forEach(submission => {
                const key = `${submission.orgUnit}_${submission.period}`;
                if (allDataSubmissions.has(key)) duplicates.push(key);
                allDataSubmissions.set(key, submission);
            });
            if (duplicates.length > 0) {
                log(
                    `${duplicates.length} duplicate AMC data submission(s) exist in the datastore (orgUnit_period: ${[
                        ...new Set(duplicates),
                    ].join(", ")}). Files for these country-years will FAIL until the duplicates are resolved.`,
                    LogLevel.ERROR
                );
            }
        } else {
            log(`No data submissions found for the given filters`, LogLevel.ERROR);
        }
    } catch (error) {
        dataSubmissionsLoadFailed = true;
        log(`Error fetching GlassDataSubmission objects: ${error}`, LogLevel.ERROR);
    }
    return allDataSubmissions;
}

function getDataSubmission(orgUnitId: string, period: string) {
    const key = `${orgUnitId}_${period}`;
    return allDataSubmissions.get(key);
}

// Keeps the in-memory map in step with reality. Without this a submission created for the first
// file of a country-year was never added to the map, so the second file (the product/substance
// pair is the normal case) missed again and re-entered the creation branch.
function rememberDataSubmission(dataSubmission: GlassDataSubmission): void {
    allDataSubmissions.set(`${dataSubmission.orgUnit}_${dataSubmission.period}`, dataSubmission);
}

// Pure read of the CURRENT submission. Deliberately NOT GetSpecificDataSubmissionUseCase, which
// creates and blind-appends a new submission whenever the match count is not exactly 1 — never
// what you want when reading state back to verify it.
async function readSubmission(orgUnit: string, period: string): Promise<GlassDataSubmission> {
    const matches = await retryWithBackoff(() =>
        glassDataSubmissionRepository.getSpecificDataSubmission(moduleId, orgUnit, period).toPromise()
    );

    const submission = matches?.[0];
    if (!submission) {
        throw new Error(`No data submission found for orgUnit ${orgUnit} and period ${period}`);
    }
    if (matches.length > 1) {
        throw new Error(
            `${
                matches.length
            } duplicate data submissions exist for orgUnit ${orgUnit} and period ${period} (ids: ${matches
                .map(match => match.id)
                .join(", ")}). Resolve the duplicates before uploading.`
        );
    }

    rememberDataSubmission(submission);
    return submission;
}

async function fetchDataSubmissionId(moduleId: string, moduleName: string, orgUnitId: string, period: string) {
    return getSpecificDataSubmission
        .execute(moduleId, moduleName, orgUnitId, period, false)
        .toPromise()
        .catch(error => {
            const errorMessage = `Error fetching data submission data for orgUnitId: ${orgUnitId} and period: ${period} with error: ${error}`;
            log(errorMessage, LogLevel.ERROR);
            throw new Error(errorMessage);
        });
}

// Determines what (if anything) already exists for this file's submission so re-runs are
// idempotent and self-healing. The decision itself lives in ./utils/amuBulkUploadPolicy so it can
// be unit-tested; this wrapper only narrows the uploads to the right submission and re-reads the
// submission status, which must be CURRENT rather than the value cached at startup.
function getFileState(fileMetaData: FileMetaData, submissionStatus: GlassDataSubmission["status"]): FileState {
    const { period, orgUnit, id: dataSubmissionId } = fileMetaData.batchMetaData.dataSubmission;
    const existingUploads = fileMetaData.batchMetaData.existingUploads;

    if (!Array.isArray(existingUploads)) {
        throw new Error(`existingUploads is not an array for submission ${dataSubmissionId}`);
    }

    const scoped = existingUploads.filter(upload => upload.period === period && upload.orgUnit === orgUnit);

    return classifyFileState({
        fileType: fileMetaData.fileType,
        existingUploads: scoped,
        submission: { status: submissionStatus },
    });
}

export interface BufferFile {
    /** Base name of the file, e.g., "photo.jpg" */
    name: string;
    /** MIME type, e.g., "image/jpeg" (best-effort from extension) */
    type: string;
    /** Size in bytes */
    size: number;
    /** Last modified epoch ms (using fs.stat or Date.now() fallback) */
    lastModified: number;
    /** The raw file data */
    buffer: Buffer;
    /**
     * Optional convenience: a zero-copy ArrayBuffer view on the same memory.
     * Helpful if some API insists on ArrayBuffer.
     */
    arrayBuffer: ArrayBuffer;
}

function toArrayBufferCopy(buf: Buffer): ArrayBuffer {
    const ab = new ArrayBuffer(buf.length);
    new Uint8Array(ab).set(buf);
    return ab;
}

export async function createBufferFileFromPath(filePath: string): Promise<BufferFile> {
    const fileName = path.basename(filePath);
    const type = detectMimeFromExt(fileName);
    const [buf, stat] = await Promise.all([
        fs.readFile(filePath),
        fs.stat(filePath).catch(() => null), // tolerate missing stat
    ]);

    const lastModified = stat?.mtimeMs ?? Date.now();
    const arrayBuffer = toArrayBufferCopy(buf);

    const result: BufferFile = {
        name: fileName,
        type,
        size: buf.length,
        lastModified,
        buffer: buf,
        arrayBuffer,
    };

    return result;
}

// Detect correct MIME for logs and downstream metadata
function detectMimeFromExt(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    // Only .xlsx reaches here: the import path is xlsx-populate, which is OOXML-only, so .xls and
    // .csv are rejected by parseAmuFileName rather than advertised as supported.
    return ext === ".xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/octet-stream";
}

async function validateFile(fileMetaData: FileMetaData): Promise<FileData> {
    try {
        const module = await moduleRepository.getByName(moduleName).toPromise();

        if (!module) {
            throw new Error(`Module '${moduleName}' does not exist`);
        }

        // Product and substance use different validation signatures/column lists, matching the UI
        // (ValidatePrimaryFileUseCase vs ValidateSampleFileUseCase). validateFileBuffer returns a
        // FutureData (fluture Future), so it must be resolved with .toPromise() — awaiting the Future
        // directly yields the unresolved Future object (whose .isValid is undefined).
        // No `?? []` fallback: `_.every([], …)` is vacuously true, so an empty column list would
        // make EVERY file validate. The UI hard-errors in the same situation
        // (ValidatePrimaryFileUseCase / ValidateSampleFileUseCase). assertModuleColumnsConfigured
        // has already checked these at startup; this is belt-and-braces.
        if (fileMetaData.fileType === "product") {
            if (!module.dataColumns?.length || !module.teiColumns?.length) {
                throw new Error("AMC module is missing dataColumns/teiColumns; cannot validate product files");
            }
            return await amcProductDataRepository
                .validateFileBuffer(fileMetaData.fileBuffer.arrayBuffer, module.dataColumns, module.teiColumns)
                .toPromise();
        }
        if (!module.rawSubstanceDataColumns?.length) {
            throw new Error("AMC module is missing rawSubstanceDataColumns; cannot validate substance files");
        }
        return await amcSubstanceDataRepository
            .validateFileBuffer(fileMetaData.fileBuffer.arrayBuffer, module.rawSubstanceDataColumns)
            .toPromise();
    } catch (error) {
        const msg = `Validation error for file ${fileMetaData.fileName}: ${
            error instanceof Error ? error.message : String(error)
        }`;

        log(msg, LogLevel.ERROR);
        throw new Error(msg);
    }
}

/*
================================================================
END OF HELPER FUNCTIONS AND UTILS (PERHAPS COULD GO INTO ANOTHER FILE)
================================================================
*/

/*
================================================================
FILE PROCESSING FUNCTIONS
================================================================
*/

async function uploadFileToDataStore(fileMetaData: FileMetaData): Promise<FileMetaData> {
    try {
        fileMetaData.fileId = await retryWithBackoff(() =>
            glassDocumentsRepository
                .saveBuffer(fileMetaData.fileBuffer.buffer, fileMetaData.fileName, moduleName)
                .toPromise()
        );
    } catch (error) {
        const errorMessage = `Error during the ${fileMetaData.fileType} file import process: ${
            fileMetaData.fileName
        }, ${error instanceof Error ? error.message : String(error)}`;
        log(errorMessage, LogLevel.ERROR);
        throw new Error(errorMessage);
    }

    const uploadData: GlassUploads = {
        id: generateUid(),
        batchId: fileMetaData.batchMetaData.batchId,
        countryCode: fileMetaData.batchMetaData.orgUnitCode,
        fileType: getUploadFileTypeLabel(fileMetaData.fileType),
        fileId: fileMetaData.fileId,
        fileName: fileMetaData.fileName,
        dataSubmission: fileMetaData.batchMetaData.dataSubmission.id,
        inputLineNb: 0,
        outputLineNb: 0,
        module: moduleId,
        period: fileMetaData.batchMetaData.dataSubmission.period,
        uploadDate: new Date().toISOString(),
        status: "UPLOADED",
        orgUnit: fileMetaData.batchMetaData.dataSubmission.orgUnit,
        rows: fileMetaData.fileData.rows,
        specimens: fileMetaData.fileData.specimens,
        correspondingRisUploadId: "",
    };

    try {
        await retryWithBackoff(() => glassUploadsRepository.save(uploadData).toPromise());
        fileMetaData.fileUploadId = uploadData.id;
        return fileMetaData;
    } catch (uploadError) {
        const errorMessage = `Error saving file upload data for ${fileMetaData.fileType} file: ${
            fileMetaData.fileName
        }, ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
        log(errorMessage, LogLevel.ERROR);
        throw new Error(errorMessage);
    }
}

async function uploadDataValues(fileMetaData: FileMetaData) {
    let importSummary;
    await dataValues_semaphore.acquire();
    //console.info("uploadDataValues acquire dataValues_semaphore  getActiveCount: ", dataValues_semaphore.getActiveCount(), fileMetaData.file.name);
    //console.info("Tasks waiting for semaphore: ", dataValues_semaphore.getTasks().length);
    const startTime = Date.now();
    try {
        if (fileMetaData.fileType === "product") {
            const importAMCProductFile = new ImportAMCProductLevelData(
                excelRepository,
                instanceRepository,
                trackerRepository,
                glassDocumentsRepository,
                glassUploadsRepository,
                metadataRepository,
                programRulesMetadataRepository,
                atcRepository,
                amcProductDataRepository,
                amcSubstanceDataRepository
            );
            console.info(`  importing product data: ${fileMetaData.fileName}`);

            importSummary = await importAMCProductFile
                .importAMCProductFileAsBuffer(
                    fileMetaData.fileBuffer.arrayBuffer,
                    CREATE_AND_UPDATE,
                    "",
                    fileMetaData.batchMetaData.dataSubmission.orgUnit,
                    fileMetaData.batchMetaData.orgUnitName,
                    moduleName,
                    fileMetaData.batchMetaData.dataSubmission.period,
                    fileMetaData.fileUploadId,
                    allCountries
                )
                .toPromise();
        } else {
            console.info(`  importing substance data: ${fileMetaData.fileName}`);
            const importRawSubstanceData = new ImportAMCSubstanceLevelData(
                excelRepository,
                instanceRepository,
                glassDocumentsRepository,
                glassUploadsRepository,
                dhis2EventsDefaultRepository,
                metadataRepository,
                programRulesMetadataRepository,
                atcRepository
            );
            importSummary = await importRawSubstanceData
                .importAsBuffer(
                    fileMetaData.fileBuffer.arrayBuffer,
                    CREATE_AND_UPDATE,
                    "",
                    moduleName,
                    fileMetaData.batchMetaData.dataSubmission.orgUnit,
                    fileMetaData.batchMetaData.orgUnitName,
                    fileMetaData.batchMetaData.dataSubmission.period,
                    fileMetaData.fileUploadId
                )
                .toPromise();
        }

        if (importSummary.status === "ERROR" || importSummary.blockingErrors.length > 0) {
            console.error(
                "Here are the blocking errors for the failed metadata import: ",
                importSummary.blockingErrors
            );
            console.error(
                "Here are the non blocking errors for the failed metadata import: ",
                importSummary.nonBlockingErrors
            );
            const errorMessage = `File ${fileMetaData.fileName} metadata NOT imported! with importSummary status ${
                importSummary.status
            }   ${importSummary.blockingErrors.map(error => `  - ${error.error}`).join("\n")} `;
            console.error(errorMessage, LogLevel.ERROR);
            // Itemize the import failure into the UPLOAD phase columns/log (currentPhase is still
            // "UPLOAD" here) so a FAILED-at-upload row shows exactly which import errors occurred and
            // in which phase, not just the joined reason string. The throw below is caught in
            // uploadDataValuesAndFile, which records FAILED reading these now-populated upload counters.
            captureConsistencyErrors(importSummary.blockingErrors, fileMetaData.fileName, "UPLOAD", "Error");
            captureConsistencyErrors(importSummary.nonBlockingErrors, fileMetaData.fileName, "UPLOAD", "Warn");
            //await setUploadStatusUseCase.execute({ id: fileMetaData.fileUploadId, status: "IMPORTED" }).toPromise();
            throw new Error(errorMessage);
        } else {
            //await setUploadStatusUseCase.execute({ id: fileMetaData.fileUploadId, status: "VALIDATED" }).toPromise();
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            console.info(`  imported ${fileMetaData.fileName} (${importSummary.status}) in ${elapsedSeconds}s`);
            return importSummary;
        }
    } catch (error) {
        const errorMessage = ` Error in the Metadata import for file: ${fileMetaData.fileName}. ${error} `;
        //console.error(errorMessage);
        throw new Error(errorMessage);
    } finally {
        dataValues_semaphore.release();
        //console.log(`datastore_semaphore released: ${datastore_semaphore.getActiveCount()} for ${fileMetaData.fileName}`);
    }
}

async function processFile(fileMetaData: FileMetaData): Promise<FileMetaData> {
    // Acquired OUTSIDE the try: if acquire() threw, the finally block would release a permit that
    // was never taken.
    await datastore_semaphore.acquire();
    try {
        //console.log(`datastore_semaphore acquired: ${datastore_semaphore.getActiveCount()} for ${fileMetaData.fileName}`);
        fileMetaData = await uploadFileToDataStore(fileMetaData);
        return fileMetaData;
    } catch (error) {
        const errorMessage = ` An error occurred during ${fileMetaData.fileType} processing! ${fileMetaData.fileName} ${error} `;
        log(errorMessage, LogLevel.ERROR);
        fileMetaData.fileUploadId = "";
        throw new Error(errorMessage);
    } finally {
        datastore_semaphore.release();
        //console.log(`datastore_semaphore released: ${datastore_semaphore.getActiveCount()} for ${fileMetaData.fileName}`);
    }
}

function outcomeDetail(fileMetaData: FileMetaData, startTime: number, reason?: string) {
    // Captured diagnostic messages for this file, kept in separate upload/calc columns (rather than
    // one combined column) so it's unambiguous which phase each issue came from without needing to
    // parse a tag out of the text.
    const upload = summariseBucket(currentFileDiagnostics.upload);
    const calc = summariseBucket(currentFileDiagnostics.calc);
    return {
        orgUnitCode: fileMetaData.batchMetaData.orgUnitCode,
        period: fileMetaData.batchMetaData.dataSubmission.period,
        fileType: fileMetaData.fileType,
        reason,
        durationSeconds: Math.floor((Date.now() - startTime) / 1000),
        uploadWarnCount: upload.warnings,
        uploadErrorCount: upload.errors,
        uploadIssueDetails: upload.messages.join(" | ") || undefined,
        calcWarnCount: calc.warnings,
        calcErrorCount: calc.errors,
        calcIssueDetails: calc.messages.join(" | ") || undefined,
    };
}

async function uploadDataValuesAndFile(fileMetaData: FileMetaData): Promise<void> {
    await batch_semaphore.acquire();
    const startTime = Date.now();
    try {
        console.info(
            `Processing ${fileMetaData.fileName} (${fileMetaData.batchMetaData.orgUnitCode} ${fileMetaData.batchMetaData.dataSubmission.period})`
        );

        // Idempotent re-runs: resume from wherever a previous attempt stopped rather than
        // re-importing. The submission status is re-read here rather than taken from the startup
        // map, which goes stale as this run mutates submissions.
        const submission = await readSubmission(
            fileMetaData.batchMetaData.dataSubmission.orgUnit,
            fileMetaData.batchMetaData.dataSubmission.period
        );
        const state = getFileState(fileMetaData, submission.status);

        switch (state.kind) {
            case "conflict": {
                // AMC is isSingleFileTypePerSubmission: uploading both a product and a substance
                // file for one country-year breaks the app's own rule. Which file is authoritative
                // is a business decision, so escalate rather than guess.
                const reason = `CONFLICT: this ${fileMetaData.fileType} file cannot be uploaded because upload ${state.conflicting.id} ("${state.conflicting.fileName}", ${state.conflicting.fileType}, status ${state.conflicting.status}) already holds this country-year. AMC allows only one file type per submission.`;
                log(`${reason} (${formatDuration(Date.now() - startTime)})`, LogLevel.ERROR);
                recordOutcome("NEEDS_REVIEW", fileMetaData.fileName, outcomeDetail(fileMetaData, startTime, reason));
                return;
            }
            case "done": {
                log(
                    `Already completed and submitted, skipping: ${fileMetaData.fileName} (${formatDuration(
                        Date.now() - startTime
                    )})`,
                    LogLevel.WARN
                );
                recordOutcome(
                    "SKIPPED",
                    fileMetaData.fileName,
                    outcomeDetail(fileMetaData, startTime, "Already completed")
                );
                return;
            }
            case "finalize-submission": {
                // The upload reached COMPLETED but the submission transitions did not all run —
                // previously this was classified "completed" and skipped forever.
                fileMetaData.fileUploadId = state.upload.id;
                fileMetaData.fileId = state.upload.fileId;
                console.info(
                    `Repairing ${fileMetaData.fileName}: upload is COMPLETED, submission is ${
                        submission.status
                    } — running ${state.transitions.join(" then ")}`
                );
                currentPhase = "CALCULATION";
                await finalizeSubmissionOnly(fileMetaData, startTime, state.transitions);
                return;
            }
            case "resume-complete": {
                // VALIDATED: imported + calculated already; only the completion steps remain.
                fileMetaData.fileUploadId = state.upload.id;
                fileMetaData.fileId = state.upload.fileId;
                console.info(`Resuming ${fileMetaData.fileName} from VALIDATED — completing submission only`);
                currentPhase = "CALCULATION";
                await completeSubmission(fileMetaData, startTime);
                return;
            }
            case "resume-calculate": {
                // IMPORTED with an event list and no calculated list: safe to calculate.
                fileMetaData.fileUploadId = state.upload.id;
                fileMetaData.fileId = state.upload.fileId;
                console.info(`Resuming ${fileMetaData.fileName} from IMPORTED — running calculation + completion`);
                currentPhase = "CALCULATION";
                await calculateAndComplete(fileMetaData, startTime);
                return;
            }
            case "orphaned-upload": {
                // A previous run saved the document and upload record but never imported. Creating
                // a second document + upload record here is exactly what must not happen: the
                // documents datastore is a blind append with no dedupe.
                const reason = `ORPHANED UPLOAD: upload ${state.upload.id} (fileId ${state.upload.fileId}, "${state.upload.fileName}", orgUnit ${fileMetaData.batchMetaData.orgUnitCode}, period ${fileMetaData.batchMetaData.dataSubmission.period}) is stuck at UPLOADED with nothing imported. Not creating a duplicate. Delete it (delete_file_by_uploadId.ts) and re-run.`;
                log(`${reason} (${formatDuration(Date.now() - startTime)})`, LogLevel.ERROR);
                recordOutcome("NEEDS_REVIEW", fileMetaData.fileName, outcomeDetail(fileMetaData, startTime, reason));
                return;
            }
            case "needs-review": {
                const reason = `NEEDS REVIEW: upload ${state.upload.id} ("${state.upload.fileName}") — ${state.reason}`;
                log(`${reason} (${formatDuration(Date.now() - startTime)})`, LogLevel.ERROR);
                recordOutcome("NEEDS_REVIEW", fileMetaData.fileName, outcomeDetail(fileMetaData, startTime, reason));
                return;
            }
            case "fresh":
                break;
        }

        // 1. Validate the file first (mirrors the UI's validate-at-selection step). This both
        //    gates invalid files and provides rows/specimens for the upload record.
        fileMetaData.fileData = await validateFile(fileMetaData);
        if (!fileMetaData.fileData.isValid) {
            log(
                `File ${fileMetaData.fileName} is not a valid ${
                    fileMetaData.fileType
                } file. Skipping. (${formatDuration(Date.now() - startTime)})`,
                LogLevel.ERROR
            );
            recordOutcome(
                "FAILED",
                fileMetaData.fileName,
                outcomeDetail(fileMetaData, startTime, "Failed column validation")
            );
            return;
        }

        // 2. Create the upload record BEFORE importing (as the UI does via UploadDocumentUseCase).
        //    This saves the document, captures the real fileId, and sets fileUploadId so the
        //    import can associate its event-id list file with this upload.
        await processFile(fileMetaData);

        // 3. Import the raw data using the real upload id.
        const importSummary = await uploadDataValues(fileMetaData);

        // Capture the structured import diagnostics (upload phase) into the durable log — these
        // were previously persisted only to the DHIS2 upload record via
        // saveImportSummaryErrorsOfFilesInUploads below, never to the durable log/CSV. A blocking
        // error here would already have thrown inside uploadDataValues, so in practice only
        // nonBlockingErrors is non-empty on this success path; blockingErrors is captured too for
        // completeness/defense in depth.
        captureConsistencyErrors(importSummary.nonBlockingErrors, fileMetaData.fileName, "UPLOAD", "Warn");
        captureConsistencyErrors(importSummary.blockingErrors, fileMetaData.fileName, "UPLOAD", "Error");

        const importVerdict = evaluateImportSummary(importSummary);
        if (importVerdict.outcome === "fail") {
            throw new Error(importVerdict.reason);
        }

        // PROVE the raw import is recoverable before going any further. mapToImportSummary only
        // fills eventIdList when the tracker returned OK, so a WARNING import writes data into
        // DHIS2 and saves NO event-id list — leaving data that cannot be deleted through the app
        // and cannot be resumed. This read-back is the only way to detect that.
        const uploadAfterImport = await retryWithBackoff(() =>
            glassUploadsRepository.getById(fileMetaData.fileUploadId).toPromise()
        );
        if (!uploadAfterImport?.eventListFileId) {
            const reason = `Import reported ${importSummary.status} but no eventListFileId was saved on upload ${fileMetaData.fileUploadId} (orgUnit ${fileMetaData.batchMetaData.orgUnitCode}, period ${fileMetaData.batchMetaData.dataSubmission.period}). Raw data may be in DHIS2 with no id list, so it cannot be deleted through the app or resumed. Clean up with delete_file_by_uploadId.ts + amc_delete_data_for_period_ou.ts before retrying.`;
            log(`${reason} (${formatDuration(Date.now() - startTime)})`, LogLevel.ERROR);
            recordOutcome("NEEDS_REVIEW", fileMetaData.fileName, outcomeDetail(fileMetaData, startTime, reason));
            return;
        }

        // Persist the import summary (blocking/non-blocking errors) onto the upload record, as the
        // UI does via saveImportSummaryErrorsOfFiles. The UI only does this for the primary/product
        // file (the AMC substance/secondary path does not), so we match that behaviour.
        if (fileMetaData.fileType === "product") {
            await retryWithBackoff(() =>
                glassUploadsRepository
                    .saveImportSummaryErrorsOfFilesInUploads({
                        primaryUploadId: fileMetaData.fileUploadId,
                        primaryImportSummaryErrors: {
                            nonBlockingErrors: importSummary.nonBlockingErrors,
                            blockingErrors: importSummary.blockingErrors,
                        },
                    })
                    .toPromise()
            );
        }

        await retryWithBackoff(() =>
            setUploadStatusUseCase.execute({ id: fileMetaData.fileUploadId, status: "IMPORTED" }).toPromise()
        );

        // 4 + 5. Calculate consumption, then complete the submission.
        currentPhase = "CALCULATION";
        await calculateAndComplete(fileMetaData, startTime);
    } catch (error) {
        const errorMessage = `Error processing file: ${fileMetaData.fileName}: ${
            error instanceof Error ? error.message : String(error)
        } `;
        log(`${errorMessage}(${formatDuration(Date.now() - startTime)})`, LogLevel.ERROR);
        recordOutcome("FAILED", fileMetaData.fileName, outcomeDetail(fileMetaData, startTime, errorMessage));
    } finally {
        batch_semaphore.release();
    }
}

// Runs the consumption calculation for an already-imported file, then completes the submission.
// Gates upload status on the result (as the UI does) and records the file's outcome. Does not throw:
// all failure paths are logged + recorded so the caller's loop continues.
async function calculateAndComplete(fileMetaData: FileMetaData, startTime: number): Promise<void> {
    let calculationSummary;
    try {
        if (fileMetaData.fileType === "product") {
            calculationSummary = await consumptionDataProductLevel
                .execute(
                    fileMetaData.batchMetaData.dataSubmission.period,
                    fileMetaData.batchMetaData.dataSubmission.orgUnit,
                    moduleName,
                    fileMetaData.fileUploadId
                )
                .toPromise();
        } else {
            calculationSummary = await consumptionDataSubstanceLevel
                .execute(
                    fileMetaData.fileUploadId,
                    fileMetaData.batchMetaData.dataSubmission.period,
                    fileMetaData.batchMetaData.dataSubmission.orgUnit,
                    moduleName
                )
                .toPromise();
        }
    } catch (calcError) {
        await retryWithBackoff(() =>
            setUploadStatusUseCase.execute({ id: fileMetaData.fileUploadId, status: "IMPORTED" }).toPromise()
        );
        const reason = `Consumption calculation failed: ${
            calcError instanceof Error ? calcError.message : String(calcError)
        }`;
        log(`${reason} (file: ${fileMetaData.fileName}, ${formatDuration(Date.now() - startTime)})`, LogLevel.ERROR);
        recordOutcome("FAILED", fileMetaData.fileName, outcomeDetail(fileMetaData, startTime, reason));
        return;
    }

    // Itemize the structured calc errors into the CALCULATION phase columns/log.
    captureConsistencyErrors(calculationSummary.blockingErrors, fileMetaData.fileName, "CALCULATION", "Error");
    captureConsistencyErrors(calculationSummary.nonBlockingErrors, fileMetaData.fileName, "CALCULATION", "Warn");

    // Read the upload back so the verdict can be based on what was actually persisted rather than
    // on what the API said. Both calculation use cases can report status "ERROR" with EMPTY
    // blockingErrors through the SUCCESS channel (the "nothing to import" path), which the old
    // blockingErrors-only check accepted as a full success.
    const uploadAfterCalc = await retryWithBackoff(() =>
        glassUploadsRepository.getById(fileMetaData.fileUploadId).toPromise()
    );

    const verdict = classifyCalculationOutcome({
        summary: calculationSummary,
        uploadAfterCalc: uploadAfterCalc ?? {},
        diagnostics: currentFileDiagnostics.calc.entries,
    });

    if (verdict.outcome === "failed" || verdict.outcome === "needs-review") {
        // Leave the upload at IMPORTED (as the UI does on a failed calculation) so a later run can
        // resume it — unless the calculation already committed, in which case classifyFileState
        // will escalate rather than recalculate.
        await retryWithBackoff(() =>
            setUploadStatusUseCase.execute({ id: fileMetaData.fileUploadId, status: "IMPORTED" }).toPromise()
        );
        const reason = `Consumption calculation ${verdict.outcome}: ${verdict.reason}`;
        log(`${reason} (file: ${fileMetaData.fileName}, ${formatDuration(Date.now() - startTime)})`, LogLevel.ERROR);
        recordOutcome(
            verdict.outcome === "failed" ? "FAILED" : "NEEDS_REVIEW",
            fileMetaData.fileName,
            outcomeDetail(fileMetaData, startTime, reason)
        );
        return;
    }

    if (verdict.outcome === "succeeded-with-calculation-issues") {
        // Expected in GLASS AMU: some source lines legitimately cannot produce calculated output.
        log(`Calculation completed with expected exclusions (${fileMetaData.fileName}): ${verdict.reason}`);
    }

    await retryWithBackoff(() =>
        setUploadStatusUseCase.execute({ id: fileMetaData.fileUploadId, status: "VALIDATED" }).toPromise()
    );

    await completeSubmission(fileMetaData, startTime);
}

// Final step: mark the upload COMPLETED and the submission COMPLETE -> PENDING_APPROVAL, and record
// the file as succeeded. Does not throw; failures are logged + recorded.
async function completeSubmission(fileMetaData: FileMetaData, startTime: number): Promise<void> {
    await datastore_semaphore.acquire();
    try {
        await handlePostUploadBatchDatastoreUpdates(fileMetaData);

        // Bake the phase(s) that raised a diagnostic directly into the outcome status. A file whose
        // import and calculation both succeeded is never reclassified as FAILED just because some
        // source lines were legitimately not calculable — that is expected in GLASS AMU and the UI
        // completes these files too — but SUCCEEDED_WITH_*_ISSUES makes them easy to find.
        const upload = summariseBucket(currentFileDiagnostics.upload);
        const calc = summariseBucket(currentFileDiagnostics.calc);
        const uploadIssues = upload.warnings + upload.errors > 0;
        const calcIssues = calc.warnings + calc.errors > 0;
        const outcome: OutcomeStatus =
            uploadIssues && calcIssues
                ? "SUCCEEDED_WITH_UPLOAD_AND_CALCULATION_ISSUES"
                : uploadIssues
                ? "SUCCEEDED_WITH_UPLOAD_ISSUES"
                : calcIssues
                ? "SUCCEEDED_WITH_CALCULATION_ISSUES"
                : "SUCCEEDED";

        // Keep the CSV `reason` short/readable — a compact phase summary, not the full message text.
        // The full messages are in the CSV's own uploadIssueDetails/calcIssueDetails columns (and,
        // timestamped, in the .txt log). "w" counts expected methodological exclusions.
        const issuesSummary =
            uploadIssues || calcIssues
                ? `upload: ${upload.warnings}w/${upload.errors}e, calc: ${calc.warnings}w/${calc.errors}e (${calc.counts.methodological} expected exclusions) — see uploadIssueDetails/calcIssueDetails columns`
                : undefined;

        log(
            `DONE ${fileMetaData.fileName} in ${formatDuration(Date.now() - startTime)} (-> PENDING_APPROVAL)${
                issuesSummary ? ` [${issuesSummary}]` : ""
            }`
        );
        recordOutcome(outcome, fileMetaData.fileName, outcomeDetail(fileMetaData, startTime, issuesSummary));
    } catch (uploadError) {
        const reason = `Error completing submission: ${
            uploadError instanceof Error ? uploadError.message : String(uploadError)
        }`;
        log(`${reason} (file: ${fileMetaData.fileName}, ${formatDuration(Date.now() - startTime)})`, LogLevel.ERROR);
        recordOutcome("FAILED", fileMetaData.fileName, outcomeDetail(fileMetaData, startTime, reason));
    } finally {
        datastore_semaphore.release();
    }
}

// Repairs a file whose upload already reached COMPLETED but whose submission transitions did not
// all run. Previously unreachable: such a file was classified "completed" and skipped forever.
async function finalizeSubmissionOnly(
    fileMetaData: FileMetaData,
    startTime: number,
    transitions: SubmissionTransition[]
): Promise<void> {
    await datastore_semaphore.acquire();
    try {
        await applySubmissionTransitions(fileMetaData, transitions);
        await verifyTerminalState(fileMetaData);
        const reason = `Repaired: submission transitions ${transitions.join(
            " -> "
        )} applied to an already-COMPLETED upload`;
        log(`DONE ${fileMetaData.fileName} in ${formatDuration(Date.now() - startTime)} (${reason})`);
        recordOutcome("SUCCEEDED", fileMetaData.fileName, outcomeDetail(fileMetaData, startTime, reason));
    } catch (error) {
        const reason = `Error repairing submission: ${error instanceof Error ? error.message : String(error)}`;
        log(`${reason} (file: ${fileMetaData.fileName}, ${formatDuration(Date.now() - startTime)})`, LogLevel.ERROR);
        recordOutcome("FAILED", fileMetaData.fileName, outcomeDetail(fileMetaData, startTime, reason));
    } finally {
        datastore_semaphore.release();
    }
}

// Applies only the transitions that are actually outstanding. setStatus has NO transition guard and
// appends a statusHistory entry on every call, so writing a status the submission already holds —
// or downgrading one that has moved on — silently rewrites a submitted record and pollutes history.
async function applySubmissionTransitions(
    fileMetaData: FileMetaData,
    transitions: SubmissionTransition[]
): Promise<void> {
    const { id: submissionId, orgUnit, period } = fileMetaData.batchMetaData.dataSubmission;

    for (const target of transitions) {
        const current = await readSubmission(orgUnit, period);

        if (current.status === target) {
            log(`Submission ${submissionId} is already ${target}; skipping redundant transition`, LogLevel.WARN);
            continue;
        }
        if (target === "COMPLETE" && (current.status === "PENDING_APPROVAL" || current.status === "APPROVED")) {
            log(`Submission ${submissionId} is ${current.status}; not downgrading it to COMPLETE`, LogLevel.WARN);
            continue;
        }

        await retryWithBackoff(() => setSubmissionStatus.execute(submissionId, target).toPromise());
    }
}

// Reads the upload and submission back so "SUCCEEDED" means the terminal states are actually in the
// datastore, not merely that the writes were requested without throwing.
async function verifyTerminalState(fileMetaData: FileMetaData): Promise<void> {
    const { id: submissionId, orgUnit, period } = fileMetaData.batchMetaData.dataSubmission;

    const upload = await retryWithBackoff(() => glassUploadsRepository.getById(fileMetaData.fileUploadId).toPromise());
    if (upload?.status !== "COMPLETED") {
        throw new Error(
            `Upload ${fileMetaData.fileUploadId} read back as ${upload?.status ?? "missing"}, expected COMPLETED`
        );
    }

    const submission = await readSubmission(orgUnit, period);
    if (submission.status !== "PENDING_APPROVAL") {
        throw new Error(`Submission ${submissionId} read back as ${submission.status}, expected PENDING_APPROVAL`);
    }
}

async function handlePostUploadBatchDatastoreUpdates(fileMetaData: FileMetaData) {
    const fileUploadId = fileMetaData.fileUploadId;
    const submissionId = fileMetaData.batchMetaData.dataSubmission.id;
    try {
        await retryWithBackoff(() =>
            setUploadStatusUseCase.execute({ id: fileUploadId, status: "COMPLETED" }).toPromise()
        );

        // Reproduce the UI's two-step submission completion so the status history is identical to
        // a manual submission: marking the upload complete moves the submission to COMPLETE
        // (UploadsTableBody), then "Send submission" moves it to PENDING_APPROVAL (Submission tab).
        await applySubmissionTransitions(fileMetaData, ["COMPLETE", "PENDING_APPROVAL"]);

        await verifyTerminalState(fileMetaData);
    } catch (error) {
        const errorMessage = `Error during the update of statuses for submission ${submissionId}, file Id ${fileUploadId}: ${
            error instanceof Error ? error.message : String(error)
        }`;
        log(errorMessage, LogLevel.ERROR);
        throw new Error(errorMessage);
    }
}
/*
================================================================
END OF FILE PROCESSING FUNCTIONS
================================================================
*/

async function processDirectory(directoryPath: string): Promise<void> {
    const files = await fs.readdir(directoryPath);
    //const files = fs.readdirSync(directoryPath);

    for (const file of files) {
        //await Promise.all(
        //  files.map(async file => {
        if (fatalAuthErrorMessage) {
            log(`Aborting — ${fatalAuthErrorMessage}`, LogLevel.ERROR);
            return;
        }
        const filePath = path.join(directoryPath, file);
        const fileStartTime = Date.now();
        currentPhase = "UPLOAD";
        currentFileDiagnostics = { upload: newDiagnosticsBucket(), calc: newDiagnosticsBucket() };

        try {
            if ((await fs.lstat(filePath)).isDirectory()) {
                console.log("It's a directory:", filePath);
                await processDirectory(filePath);
            } else {
                const fileName = path.basename(filePath);

                // One explicit filename policy. Everything is classified — nothing silently
                // disappears, and nothing that is not exactly product/substance reaches the
                // import. Crucially, the period is validated BEFORE the submission lookup, so a
                // malformed name can no longer create a junk GlassDataSubmission.
                const parsed = parseAmuFileName(fileName);
                if (parsed.kind === "ignore") {
                    console.info(`Ignoring ${fileName}: ${parsed.reason}`);
                    continue;
                }
                if (parsed.kind === "skip") {
                    log(`Skipping ${fileName}: ${parsed.reason}`, LogLevel.WARN);
                    recordOutcome("SKIPPED", fileName, { reason: parsed.reason });
                    continue;
                }
                if (parsed.kind === "reject") {
                    log(parsed.reason, LogLevel.ERROR);
                    recordOutcome("FAILED", fileName, { reason: parsed.reason });
                    continue;
                }

                const { fileType, orgUnitCode, period } = parsed;
                const batchId = ""; //no batchId in AMU files

                const orgUnitId = orgUnits[orgUnitCode];
                if (!orgUnitId) {
                    throw new Error(
                        `Org unit code "${orgUnitCode}" from "${fileName}" does not match any level-3 organisation unit code in DHIS2.`
                    );
                }

                // Advisory only: this is a historical backfill that may legitimately predate the
                // module's configured startPeriod. Junk periods are already rejected above.
                if (amcModuleConfig && !isYearInConfiguredRange(period, amcModuleConfig)) {
                    log(
                        `Period ${period} for ${fileName} is outside the AMC module's configured range (startPeriod ${
                            amcModuleConfig.startPeriod ?? "unset"
                        }). Proceeding, but the UI may not display this year.`,
                        LogLevel.WARN
                    );
                }

                let dataSubmission = getDataSubmission(orgUnitId, period);

                if (!dataSubmission) {
                    log(
                        `No dataSubmission found for orgUnitId: ${orgUnitId} and orgUnitCode ${orgUnitCode} and period ${period} and module ${moduleName}`,
                        LogLevel.WARN
                    );
                    await saveDataSubmissions.execute(moduleId, orgUnitId, [period]).toPromise();
                    dataSubmission = await fetchDataSubmissionId(moduleId, moduleName, orgUnitId, period);
                    // Without this the second file for the same country-year (the product/substance
                    // pair is the normal case) would miss the map again and re-enter this branch.
                    rememberDataSubmission(dataSubmission);
                    log(`Created a dataSubmission for orgUnitId: ${orgUnitId} and period ${period}`, LogLevel.WARN);
                }
                const submissionId = dataSubmission.id;

                const existingUploads =
                    (await retryWithBackoff(() =>
                        glassUploadsRepository.getUploadsByDataSubmission(submissionId).toPromise()
                    )) ?? [];

                const batchMetaData: BatchMetaData = {
                    orgUnitCode: orgUnitCode,
                    orgUnitName: orgUnitNames[orgUnitCode] ?? orgUnitCode,
                    batchId: batchId,
                    dataSubmission: dataSubmission,
                    existingUploads: existingUploads,
                };

                // Read the file from disk once, then derive both the BufferFile (used for the
                // datastore save, validation and product import) and the File (used by the
                // substance import) from the same buffer.
                const fileBuffer = await createBufferFileFromPath(filePath);
                const fileMetaData: FileMetaData = {
                    fileUploadId: "",
                    fileId: "",
                    fileType: fileType,
                    fileBuffer: fileBuffer,
                    fileData: {
                        isValid: true,
                        rows: 0,
                        specimens: [],
                    },
                    fileName: fileName,
                    batchMetaData: batchMetaData,
                };

                /*console.debug('[bootstrap]', process.version, {
                    Blob: typeof Blob,
                    File: typeof File,
                });*/

                //if (fileType === "product") {
                await uploadDataValuesAndFile(fileMetaData);
                //}
            }
        } catch (error) {
            // Log and continue so a single bad file never aborts the whole batch.
            const errorMessage = `Error processing Directory: ${path.basename(filePath)}: ${error} `;
            const durationSeconds = Math.floor((Date.now() - fileStartTime) / 1000);
            log(`${errorMessage}(${formatDuration(Date.now() - fileStartTime)})`, LogLevel.ERROR);
            recordOutcome("FAILED", path.basename(filePath), { reason: errorMessage, durationSeconds });
        }
        //})
        //);
    }
}

// Module-scope so it's set the instant the script starts (before main()'s own setup work) and stays
// readable from the SIGINT handler / any abort path below, not just a natural return from main().
const runStartTime = Date.now();
let finalSummaryLogged = false;

// Prints the run summary + total elapsed time. Called from main()'s finally block (covers normal
// completion AND any thrown error, e.g. initializeGlobals failing) and from the SIGINT handler (covers
// a manual Ctrl+C abort). Guarded so a SIGINT arriving after main() has already finished doesn't
// double-print. A hard kill (taskkill /F, SIGKILL) cannot run this — no in-process code can — but every
// file already processed is safely on disk via the per-file durable log/CSV writes.
function logFinalSummary(): void {
    if (finalSummaryLogged) return;
    finalSummaryLogged = true;

    if (fatalAuthErrorMessage) {
        log(`RUN ABORTED (authentication): ${fatalAuthErrorMessage}`, LogLevel.ERROR);
    }
    const withIssuesSuffix =
        processingResults.succeededWithIssues.length > 0
            ? ` (of which ${processingResults.succeededWithIssues.length} succeeded with upload/calculation issues — see the uploadIssueDetails/calcIssueDetails columns in the progress CSV)`
            : "";
    log(
        `Summary: ${processingResults.succeeded.length} succeeded${withIssuesSuffix}, ${processingResults.failed.length} failed, ${processingResults.needsReview.length} need review, ${processingResults.skipped.length} skipped`
    );

    // Listed first and loudest: these are files that were NOT uploaded and that re-running will
    // not fix — dataset conflicts, orphaned uploads, unexplained calculation shortfalls.
    if (processingResults.needsReview.length > 0) {
        log(
            `*** ${
                processingResults.needsReview.length
            } FILE(S) NEED HUMAN REVIEW — NOT UPLOADED. Re-running will not resolve these. See the NEEDS_REVIEW rows and their reason column in the progress CSV: ${processingResults.needsReview.join(
                ", "
            )}`,
            LogLevel.ERROR
        );
    }
    if (processingResults.succeededWithIssues.length > 0) {
        log(
            `Files succeeded with issues (see per-file log lines for detail): ${processingResults.succeededWithIssues.join(
                ", "
            )}`,
            LogLevel.WARN
        );
    }
    if (processingResults.failed.length > 0) {
        log(`Failed files: ${processingResults.failed.join(", ")}`, LogLevel.ERROR);
    }
    if (processingResults.skipped.length > 0) {
        log(`Skipped files (already submitted): ${processingResults.skipped.join(", ")}`, LogLevel.WARN);
    }

    log(`Full upload process finished in ${formatDuration(Date.now() - runStartTime)}`);
    log(`Log file: ${logFilePath}`);
    log(`Progress report: ${progressFilePath}`);
}

/**
 * Validates every filename and org-unit code across all input directories WITHOUT writing anything
 * to DHIS2, and prints a grouped report.
 *
 * Worth its weight: a full run is hundreds of files each costing a tracker import job plus a
 * calculation, so discovering after six hours that the org-unit codes in the filenames do not match
 * the codes in DHIS2 is expensive. This answers that in seconds. Run with `--preflight`.
 */
async function preflight(directories: string[]): Promise<void> {
    const ok: string[] = [];
    const problems: string[] = [];
    const ignored: string[] = [];
    const periods = new Set<string>();
    const unresolvedCodes = new Set<string>();

    for (const directory of directories) {
        const exists = await fs
            .stat(directory)
            .then(stat => stat.isDirectory())
            .catch(() => false);
        if (!exists) {
            problems.push(`Directory not found: ${directory}`);
            continue;
        }

        for (const file of await fs.readdir(directory)) {
            if ((await fs.lstat(path.join(directory, file))).isDirectory()) continue;

            const parsed = parseAmuFileName(file);
            if (parsed.kind === "ignore" || parsed.kind === "skip") {
                ignored.push(`${file}: ${parsed.reason}`);
                continue;
            }
            if (parsed.kind === "reject") {
                problems.push(`${file}: ${parsed.reason}`);
                continue;
            }

            periods.add(parsed.period);
            if (!orgUnits[parsed.orgUnitCode]) {
                unresolvedCodes.add(parsed.orgUnitCode);
                problems.push(`${file}: org unit code "${parsed.orgUnitCode}" does not resolve to a DHIS2 org unit`);
                continue;
            }
            ok.push(file);
        }
    }

    log(`PREFLIGHT: ${ok.length} file(s) would be processed, ${problems.length} problem(s), ${ignored.length} ignored`);
    log(`PREFLIGHT: periods present: ${[...periods].sort().join(", ")}`);
    if (amcModuleConfig) {
        const outOfRange = [...periods].filter(period => !isYearInConfiguredRange(period, amcModuleConfig!)).sort();
        log(
            outOfRange.length > 0
                ? `PREFLIGHT: periods outside the module's configured range (startPeriod ${
                      amcModuleConfig.startPeriod ?? "unset"
                  }): ${outOfRange.join(", ")}`
                : `PREFLIGHT: all periods are inside the module's configured range`
        );
    }
    if (unresolvedCodes.size > 0) {
        log(
            `PREFLIGHT: ${unresolvedCodes.size} org unit code(s) did not resolve: ${[...unresolvedCodes]
                .sort()
                .join(
                    ", "
                )}. Check whether DHIS2 org unit codes are ISO3 or numeric — if they are numeric, NO file will match.`,
            LogLevel.ERROR
        );
    }
    ignored.forEach(entry => log(`PREFLIGHT ignored — ${entry}`, LogLevel.WARN));
    problems.forEach(entry => log(`PREFLIGHT problem — ${entry}`, LogLevel.ERROR));
    log(`PREFLIGHT complete. Nothing was written to DHIS2.`);
}

async function main() {
    console.info(`Log file: ${logFilePath}`);
    console.info(`Progress report (CSV, one line per file, updated live): ${progressFilePath}`);

    try {
        await setupNodeGlobals();
        await initializeGlobals();

        // Keep the DHIS2 session warm across this long-running job (see reauthenticate).
        const authHeartbeat = setInterval(() => {
            void reauthenticate("heartbeat");
        }, AUTH_HEARTBEAT_INTERVAL);

        try {
            const rootDirectory =
                process.env.AMU_INPUT_DIR ?? "C:\\Users\\odohertyd\\Downloads\\AMU_CSR_HistoricalData";
            const directoriesToProcess = [path.join(rootDirectory, "products"), path.join(rootDirectory, "substance")];

            // Validate everything against DHIS2 metadata without writing anything. Always do this
            // before a large run.
            if (process.argv.includes("--preflight")) {
                await preflight(directoriesToProcess);
                return;
            }

            for (const directory of directoriesToProcess) {
                const exists = await fs
                    .stat(directory)
                    .then(stat => stat.isDirectory())
                    .catch(() => false);

                // Many countries only ever submit one file type (e.g. products but no substance data),
                // so a missing folder is expected and should be skipped rather than aborting the run.
                if (!exists) {
                    log(`Directory not found, skipping: ${directory}`, LogLevel.WARN);
                    continue;
                }

                console.info(`Processing directory: ${directory}`);
                try {
                    await processDirectory(directory);
                } catch (error) {
                    log(`Error processing directory ${directory}: ${error}`, LogLevel.ERROR);
                }

                if (fatalAuthErrorMessage) break; // stop processing further directories once auth is dead
            }
        } finally {
            clearInterval(authHeartbeat); // stop the heartbeat so the process can exit cleanly
        }
    } finally {
        logFinalSummary();
    }
}

// Ctrl+C is the documented way to abort a long run (see the durable-reporting note above) — catch it so
// the overall elapsed time and summary are still logged instead of the process just vanishing mid-run.
process.on("SIGINT", () => {
    log("Run interrupted (SIGINT).", LogLevel.WARN);
    logFinalSummary();
    process.exit(130);
});

main().catch(err => {
    console.error("Fatal error occurred:", err.message);
    process.exit(1);
});

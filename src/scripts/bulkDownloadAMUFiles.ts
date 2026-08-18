import { D2Api } from "@eyeseetea/d2-api/2.34";
import dotenv from "dotenv";
import { writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import v8 from "node:v8";

import { DownloadTemplateDefaultRepository } from "../data/repositories/download-template/DownloadTemplateDefaultRepository";
import { ExcelPopulateDefaultRepository } from "../data/repositories/ExcelPopulateDefaultRepository";
import { EGASPProgramDefaultRepository } from "../data/repositories/download-template/EGASPProgramDefaultRepository";
import { BulkLoadDataStoreClient } from "../data/data-store/BulkLoadDataStoreClient";
import { MetadataDefaultRepository } from "../data/repositories/MetadataDefaultRepository";
import { ExcelRepository } from "../domain/repositories/ExcelRepository";
import { DownloadBulkPopulatedTemplateUseCase } from "../domain/usecases/DownloadBulkPopulatedTemplateUseCase";
import { DataPackage } from "../domain/entities/data-entry/DataPackage";
import {
    describeProgramTarget,
    DownloadType,
    NO_CALCULATED_DATA_AVAILABLE,
    TOO_MANY_ROWS,
} from "../domain/utils/DownloadTemplate";

import {
    AMR_GLASS_PROE_UPLOADS_PROGRAM_ID,
    getValueById,
    uploadsDHIS2Ids,
} from "../data/repositories/GlassUploadsProgramRepository";
import { GlassUploadsStatus } from "../domain/entities/GlassUploads";
import { setupConsoleLogger } from "../utils/logger";
import { getInstance, warmUpSession } from "./common";
import { getD2APiFromInstance } from "../utils/d2-api";
import { escapeCsvField } from "./utils/csvStreamWriter";

dotenv.config();

/*
================================================================
CONFIG — edit before each run
================================================================
*/
// DHIS2 org unit codes (ISO/M49 country codes) to include. Leave EMPTY to consider every country in
// the system — the script fetches the full org unit list at startup (initializeOrgUnits(), same
// pattern as bulkUploadAMRAggFiles.ts) and, combined with PRUNE_BY_COVERAGE below, downloads only
// from the ones that actually have submitted data. Set specific codes here to restrict to a subset
// instead (coverage filtering still applies on top of it).
const ORG_UNIT_CODES: string[] = [];

// Years to download. Leave EMPTY to auto-detect every year present in the system — the years are read
// for free from the same uploads query used for coverage (fetchAmcUploadMetadata()). Set explicit
// years to restrict the run; they need not be contiguous, e.g. ["2019","2021","2023"].
const YEARS: string[] = [];

// When true, before downloading each file type the script reads which countries actually have an
// AMC upload of that type (product vs substance) and skips the rest — many countries submit only one
// of the two, so this avoids running (slow) per-country tracker fetches that return nothing. If the
// coverage lookup fails or returns nothing, the script falls back to all candidate countries so it
// never silently skips a country that does have data. Forced on when ORG_UNIT_CODES is empty (see
// main()) — downloading all ~200 countries unfiltered would be extremely slow and mostly wasted work.
const PRUNE_BY_COVERAGE = true;

// Max concurrent per-org-unit fetches, PER FETCH PASS. The event pass and the tracked-entity pass
// now run concurrently (see getTrackerProgramPackage), and each honours this value independently —
// so peak in-flight requests is 2 x this, i.e. 8 at the current setting. It was 6 while the two
// passes ran one after the other, which is the same peak of 6-8 connections; the run just spends
// less wall-clock time to issue them. Drop to 1 to fall back to fully sequential fetching (the
// original, always-safe behaviour) if the proxy starts blocking at this level.
const FETCH_CONCURRENCY = 5;

// PRODUCT only: SUBMITTED and CALCULATED are two program STAGES of the same DHIS2 program, so they
// can be emitted as two tabs in ONE workbook instead of two separate files. This shares the (large)
// TEI/attributes sheet — populated once instead of twice — and does one template build / Excel
// write / serialization instead of two, cutting the PRODUCT populate cost roughly in half.
//   true  -> one file:  AMC_bulk_PRODUCT_COMBINED_<ts>.xlsx  (analysis/export only — see below)
//   false -> two files: AMC_bulk_PRODUCT_SUBMITTED/CALCULATED_<ts>.xlsx (each exactly upload format)
// IMPORTANT: a combined file is NOT the upload template format (it has an extra CALCULATED tab) and
// must not be fed back into the upload flow. Use false if you need re-uploadable files.
// SUBSTANCE is unaffected either way — its SUBMITTED/CALCULATED are different programs, not stages.
const COMBINE_PRODUCT_STAGES = true;

// When true, each year is fetched and written as its own file-set (one file per year, per file
// type/task) instead of one combined all-years file. This is what bounds peak memory: a widened
// all-countries x all-years fetch can pull millions of events into memory at once and OOM (observed:
// 1.5M PRODUCT events crashed the process) — fetching one year at a time keeps each pass to roughly
// 1/N of that. It's also what keeps every sheet under Excel's 1,048,576-row cap for a large selection,
// and gives natural per-year progress/timing. Set false only for small selections where an all-years
// single file is actually desired and known to fit in memory and under the row cap.
const CHUNK_BY_YEAR = true;

const moduleName = "AMC";
const AMC_MODULE_ID = "BVnik5xiXGJ";
const FILE_TYPES = ["PRODUCT", "SUBSTANCE"] as const;
const DOWNLOAD_TYPES: DownloadType[] = ["SUBMITTED", "CALCULATED"];

// Upload records carry the file type as a human-readable label (set by the app on upload).
const FILE_TYPE_LABELS: Record<typeof FILE_TYPES[number], string> = {
    PRODUCT: "Product Level Data",
    SUBSTANCE: "Substance Level Data",
};
// Statuses that mean the raw data actually made it into the tracker (so the country has data to
// download). UPLOADED = file saved but import not done; DELETED = removed.
const COVERAGE_STATUSES: GlassUploadsStatus[] = ["IMPORTED", "VALIDATED", "COMPLETED"];

type Coverage = Record<typeof FILE_TYPES[number], Set<string>>;
// Estimated uploaded-row count per file type per year, from the uploads program's own "rows" data
// value (summed across all countries that submitted). This is a rough, cheap-to-obtain upper bound
// on tracker event count — not the exact number the download will produce — used purely to give the
// operator a size expectation per year before the (much more expensive) real fetch runs.
type RowEstimates = Record<typeof FILE_TYPES[number], Record<string, number>>;

// Only these three outlive initializeGlobals(): the repositories exist purely to construct the use
// case, so they are locals in there rather than module state.
let api!: D2Api;
let downloadBulkPopulatedTemplate: DownloadBulkPopulatedTemplateUseCase;
let orgUnits: { [key: string]: string } = {};

let authPromise: Promise<void> | null = null;
let lastAuthTime: number | null = null;
const AUTH_COOLDOWN_PERIOD = 60000; // never refresh the session more than once per minute
const AUTH_HEARTBEAT_INTERVAL = 10 * 60 * 1000; // proactively refresh the session every 10 minutes
let fatalAuthErrorMessage: string | null = null;

// Derives a short, filesystem-safe label identifying which DHIS2 instance this run targets, purely
// algorithmically from the resolved base URL (no manual hostname->name table — that would need
// upkeep and risks asserting an incorrect label, e.g. mis-calling something "PROD"). Host prefix
// ALONE is not enough to disambiguate: e.g. extranet.who.int/dhis2-demo-indiv and
// extranet.who.int/dhis2-indiv share a host and differ only by path, so both contribute.
function deriveEnvLabel(rawUrl: string): string {
    try {
        const url = new URL(rawUrl);
        const hostPrefix = url.hostname.split(".")[0] ?? ""; // "extranet", "portal-uat", "dev"
        const pathTail = url.pathname.replace(/^\/+|\/+$/g, "").replace(/\//g, "-"); // "dhis2-demo-indiv"
        const combined = [hostPrefix, pathTail].filter(Boolean).join("-");
        const sanitized = combined
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        return sanitized || "unknown-env";
    } catch {
        return "unknown-env";
    }
}

// Read directly from process.env (not getEnvVars(), which throws if unset) since this must resolve
// before any config validation — dotenv.config() above (top of file) has already populated it.
const envLabel = deriveEnvLabel(process.env.REACT_APP_DHIS2_BASE_URL ?? "");

const runTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
// Everything this run produces (log, progress CSV, and all .xlsx files) goes into one per-run
// folder so successive runs don't scatter loose files across the working directory. The env label
// is included so files from different DHIS2 instances are never mixed up once downloaded.
const outputDir = path.join(process.cwd(), `AMU_bulk_download_${envLabel}_${runTimestamp}`);
mkdirSync(outputDir, { recursive: true });
const logFilePath = path.join(outputDir, `AMU_bulk_download_log_${runTimestamp}.txt`);
const progressFilePath = path.join(outputDir, `AMU_bulk_download_progress_${runTimestamp}.csv`);
writeFileSync(progressFilePath, "timestamp,fileType,downloadType,period,outcome,fileName,reason\n");

function recordOutcome(
    outcome: "SUCCEEDED" | "FAILED" | "SKIPPED",
    fileType: string,
    downloadType: string,
    period: string,
    fileName: string,
    reason = ""
): void {
    const row = [new Date().toISOString(), fileType, downloadType, period, outcome, fileName, reason]
        .map(escapeCsvField)
        .join(",");
    appendFileSync(progressFilePath, row + "\n");
}

/*
================================================================
Logging logic. Override console logs to put timestamps
================================================================
*/

function getTimestamp(): string {
    return new Date().toLocaleString();
}

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;

// Serialize a console argument for the logfile. Strings pass through; Errors become their stack;
// other objects are JSON-stringified (with nested Errors flattened to their stack) so structured
// error payloads are still captured rather than printed as "[object Object]".
function serializeLogArg(arg: any): string {
    if (typeof arg === "string") return arg;
    if (arg instanceof Error) return arg.stack ?? String(arg);
    try {
        return JSON.stringify(arg, (_key, value) => (value instanceof Error ? value.stack ?? String(value) : value));
    } catch {
        return String(arg);
    }
}

// EVERYTHING printed to the console is also appended to the logfile so the full run — including the
// detailed [download] progress logged by the domain/repository layers (per-country counts, "Countries
// with data", target program/stage) — is captured for after-the-fact diagnosis, not just the lines
// that happen to go through log(). Writes are wrapped so logging can never crash the run.
function appendConsoleToLogFile(args: any[]): void {
    try {
        appendFileSync(logFilePath, args.map(serializeLogArg).join(" ") + "\n");
    } catch {
        // ignore logfile write failures
    }
}

console.log = (...args: any[]) => {
    const stamped = [`[${getTimestamp()}]`, ...args];
    originalLog(...stamped);
    appendConsoleToLogFile(stamped);
};
console.error = (...args: any[]) => {
    const stamped = [`[${getTimestamp()}]`, ...args];
    originalError(...stamped);
    appendConsoleToLogFile(stamped);
};
console.warn = (...args: any[]) => {
    const stamped = [`[${getTimestamp()}]`, ...args];
    originalWarn(...stamped);
    appendConsoleToLogFile(stamped);
};
console.info = (...args: any[]) => {
    const stamped = [`[${getTimestamp()}]`, ...args];
    originalInfo(...stamped);
    appendConsoleToLogFile(stamped);
};

enum LogLevel {
    INFO = "info",
    WARN = "warn",
    ERROR = "error",
}

// Note: the console.* calls below are already captured to the logfile by the overrides above, so
// this helper does NOT append to the file itself (doing so would duplicate every line).
// `level` is typed as LogLevel (not string) so a typo'd level is a compile error rather than
// silently falling through to INFO.
function log(message: string, level: LogLevel = LogLevel.INFO): void {
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
}

/*
================================================================
Node globals + auth helpers (mirrors bulkUploadAMUFiles.ts)
================================================================
*/

async function setupNodeGlobals(): Promise<void> {
    const g = globalThis as any;

    if (typeof g.Blob !== "function" || typeof g.File !== "function" || typeof g.FormData !== "function") {
        const { Blob: PBlob, File: PFile, FormData: PFormData } = await import("formdata-node");
        if (typeof g.Blob !== "function") g.Blob = PBlob;
        if (typeof g.File !== "function") g.File = PFile;
        if (typeof g.FormData !== "function") g.FormData = PFormData;
    }

    if (typeof g._ === "undefined") {
        const lodashModule = await import("lodash");
        g._ = (lodashModule as any).default ?? lodashModule;
    }
}

function isAuthError(error: unknown): boolean {
    const text = (error instanceof Error ? error.message : String(error)).toLowerCase();
    return text.includes("401") || text.includes("403") || text.includes("unauthorized") || text.includes("forbidden");
}

async function reauthenticate(reason: string): Promise<void> {
    const now = Date.now();
    if (lastAuthTime && now - lastAuthTime < AUTH_COOLDOWN_PERIOD) return;
    if (authPromise) {
        await authPromise;
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
            fatalAuthErrorMessage = `Authentication failed during session refresh (${reason}): ${message}. Aborting the remaining downloads.`;
        }
    } finally {
        authPromise = null;
    }
}

async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    // Was 5: individual pages inside each fetch now retry themselves (see retryAsync in
    // DownloadTemplateDefaultRepository), so this outer retry only needs to cover a failure that
    // survived page-level retries — a full-run refetch no longer needs as many attempts.
    maxRetries = 2,
    delay = 2000,
    maxDelay = 20000
): Promise<T> {
    let attempt = 1;
    while (attempt <= maxRetries) {
        try {
            return await operation();
        } catch (error: any) {
            const errorText = error instanceof Error ? error.message : String(error);

            // Deterministic outcomes — no calculated data, or a selection too large for one workbook.
            // Retrying can't change these, so surface them immediately.
            if (errorText === NO_CALCULATED_DATA_AVAILABLE || errorText.startsWith(TOO_MANY_ROWS)) throw error;

            if (attempt === maxRetries) {
                throw new Error(`Failed after ${maxRetries} retries: ${errorText}`);
            }

            if (attempt === Math.floor(maxRetries / 2) || errorText.includes("Bad Gateway")) {
                await reauthenticate("retry");
                if (fatalAuthErrorMessage) throw new Error(fatalAuthErrorMessage);
            }

            const backoffDelay = Math.min(delay * Math.pow(2, attempt - 1), maxDelay);
            log(`Retry ${attempt}/${maxRetries} in ${backoffDelay}ms after error: ${errorText}`, LogLevel.WARN);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            attempt++;
        }
    }
    throw new Error(`Failed to complete operation after ${maxRetries} retries`);
}

function getEnvVars() {
    if (!process.env.REACT_APP_DHIS2_BASE_URL) throw new Error("REACT_APP_DHIS2_BASE_URL must be set in the .env file");

    const token =
        process.env.REACT_APP_DHIS2_TOKEN_PROD ||
        process.env.REACT_APP_DHIS2_TOKEN_PREPROD ||
        process.env.REACT_APP_DHIS2_TOKEN_TRAINING ||
        process.env.REACT_APP_DHIS2_TOKEN;

    if (!token && !process.env.REACT_APP_DHIS2_AUTH)
        throw new Error(
            "Either REACT_APP_DHIS2_TOKEN_PROD, REACT_APP_DHIS2_TOKEN, or REACT_APP_DHIS2_AUTH must be set in the .env file"
        );

    return token
        ? { url: process.env.REACT_APP_DHIS2_BASE_URL, token }
        : (() => {
              const auth = process.env.REACT_APP_DHIS2_AUTH!;
              const username = auth.split(":")[0] ?? "";
              const password = auth.split(":")[1] ?? "";
              if (!username || !password)
                  throw new Error("REACT_APP_DHIS2_AUTH must be in the format 'username:password'");
              return { url: process.env.REACT_APP_DHIS2_BASE_URL, auth: { username, password } };
          })();
}

async function initializeOrgUnits(): Promise<{ [key: string]: string }> {
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

    // Kosovo is not a level-3 org unit in the metadata tree — add it explicitly, as the upload
    // script does, so it can be referenced by code like any other country.
    orgUnitsObject.objects.push({ id: "I8AMbKhxlj9", name: "Kosovo", code: "601624" });

    return orgUnitsObject.objects.reduce<{ [key: string]: string }>((map, ou) => {
        map[ou.code] = ou.id;
        return map;
    }, {});
}

// Reads, from the GLASS uploads event program, which countries have ever submitted an AMC upload of
// each file type AND which years appear across those uploads. This is one lightweight paginated query
// (reading only the org unit + a few data values per upload record — NO per-record file-resource
// fetches), so it is far cheaper than probing the tracker/analytics API per country. Returns null on
// any failure so the caller can fall back to not pruning / to explicit config.
//
// Coverage is deliberately by file type only, NOT by year: the download itself filters to the
// selected years, so a country that submitted product data in some other year simply contributes no
// rows (one cheap empty fetch) — whereas year-filtering here would risk wrongly skipping a country
// if the stored upload period format ever differed from the configured YEARS strings.
//
// `years` is the union of all years seen across both file types (used to auto-populate YEARS when it
// is left empty). Years are extracted as the first 4-digit run of each upload's stored period, so it
// tolerates "2022", "2022-01-01", etc.
async function fetchAmcUploadMetadata(): Promise<{
    coverage: Coverage;
    years: string[];
    rowEstimates: RowEstimates;
} | null> {
    const coverage: Coverage = { PRODUCT: new Set(), SUBSTANCE: new Set() };
    const years = new Set<string>();
    const rowEstimates: RowEstimates = { PRODUCT: {}, SUBSTANCE: {} };
    const labelToFileType = new Map<string, typeof FILE_TYPES[number]>(
        FILE_TYPES.map(fileType => [FILE_TYPE_LABELS[fileType], fileType])
    );
    const coverageStatuses = new Set<string>(COVERAGE_STATUSES);

    const pageSize = 500;
    let page = 1;
    let result;
    try {
        do {
            result = await api.tracker.events
                .get({
                    fields: { event: true, orgUnit: true, dataValues: { dataElement: true, value: true } },
                    program: AMR_GLASS_PROE_UPLOADS_PROGRAM_ID,
                    filter: `${uploadsDHIS2Ids.moduleId}:eq:${AMC_MODULE_ID}`,
                    totalPages: true,
                    page,
                    pageSize,
                })
                .getData();

            for (const event of result.instances) {
                const status = getValueById(event.dataValues, uploadsDHIS2Ids.status) ?? "";
                const fileTypeLabel = getValueById(event.dataValues, uploadsDHIS2Ids.documentFileType) ?? "";
                const fileType = labelToFileType.get(fileTypeLabel);

                if (!fileType || !event.orgUnit) continue;
                if (!coverageStatuses.has(status)) continue;

                coverage[fileType].add(event.orgUnit);

                const year = (getValueById(event.dataValues, uploadsDHIS2Ids.period) ?? "").match(/\d{4}/)?.[0];
                if (year) {
                    years.add(year);
                    const rows = parseInt(getValueById(event.dataValues, uploadsDHIS2Ids.rows) ?? "0", 10);
                    if (rows > 0) {
                        rowEstimates[fileType][year] = (rowEstimates[fileType][year] ?? 0) + rows;
                    }
                }
            }

            page++;
        } while (result.page < Math.ceil((result.total as number) / pageSize));

        return { coverage, years: [...years].sort(), rowEstimates };
    } catch (error) {
        log(
            `Upload metadata lookup failed (${error instanceof Error ? error.message : String(error)}).`,
            LogLevel.WARN
        );
        return null;
    }
}

// Restricts the selected org units to those that actually have data of the given file type. Falls
// back to the full list when coverage is unavailable, so a coverage hiccup never drops a real country.
function pruneOrgUnits(fileType: typeof FILE_TYPES[number], orgUnitIds: string[], coverage: Coverage | null): string[] {
    if (!coverage) return orgUnitIds;
    const withData = orgUnitIds.filter(id => coverage[fileType].has(id));
    log(`${fileType}: ${withData.length}/${orgUnitIds.length} candidate countries have ${fileType.toLowerCase()} data`);
    return withData;
}

async function initializeGlobals(): Promise<void> {
    const envVars = getEnvVars();
    const instance = getInstance(envVars);
    api = getD2APiFromInstance(instance);
    await warmUpSession(api);
    await setupConsoleLogger({ isDebug: false });

    const bulkLoadDatastoreClient = new BulkLoadDataStoreClient(instance);

    const downloadTemplateRepository = new DownloadTemplateDefaultRepository(instance);
    const excelRepository: ExcelRepository = new ExcelPopulateDefaultRepository();
    const egaspProgramRepository = new EGASPProgramDefaultRepository(instance, bulkLoadDatastoreClient);
    const metadataRepository = new MetadataDefaultRepository(undefined, api);

    downloadBulkPopulatedTemplate = new DownloadBulkPopulatedTemplateUseCase(
        downloadTemplateRepository,
        excelRepository,
        egaspProgramRepository,
        metadataRepository
    );

    orgUnits = await initializeOrgUnits();
}

/*
================================================================
Download logic
================================================================
*/

// One output file to produce for a file type. `downloadType` undefined means "all stages in one
// workbook" (PRODUCT combined mode); `label` names the file and its progress-report rows.
type DownloadTask = { downloadType?: DownloadType; label: string };

// The set of output files planned for a file type. PRODUCT in combined mode yields a single
// all-stages file; otherwise each download type is a separate file (and SUBSTANCE always is, since
// its types are different programs, not stages).
function getDownloadTasks(fileType: typeof FILE_TYPES[number]): DownloadTask[] {
    if (fileType === "PRODUCT" && COMBINE_PRODUCT_STAGES) {
        return [{ downloadType: undefined, label: "COMBINED" }];
    }
    return DOWNLOAD_TYPES.map(downloadType => ({ downloadType, label: downloadType }));
}

function bulkFileName(fileType: string, label: string, periodLabel: string): string {
    return `AMC_bulk_${fileType}_${label}_${periodLabel}_${envLabel}_${runTimestamp}.xlsx`;
}

// Records the same outcome for every planned output of a file type/period — used when a whole
// file type is skipped (no coverage) or fails before per-file work starts (PRODUCT prefetch failure).
function recordOutcomeForTasks(
    outcome: "SKIPPED" | "FAILED",
    fileType: typeof FILE_TYPES[number],
    tasks: DownloadTask[],
    periodLabel: string,
    reason: string
): void {
    for (const task of tasks) {
        recordOutcome(
            outcome,
            fileType,
            task.label,
            periodLabel,
            bulkFileName(fileType, task.label, periodLabel),
            reason
        );
    }
}

async function downloadCombination(
    fileType: typeof FILE_TYPES[number],
    task: DownloadTask,
    orgUnitIds: string[],
    years: string[],
    periodLabel: string,
    options?: {
        fetchConcurrency?: number;
        prefetchedDataPackage?: DataPackage;
        orgUnitLabels?: Record<string, string>;
    }
): Promise<void> {
    const { downloadType, label } = task;
    const fileName = bulkFileName(fileType, label, periodLabel);
    console.info(
        `Downloading ${fileType} / ${label} / ${periodLabel} for ${orgUnitIds.length} org units, ` +
            `years: ${years.join(", ")}` +
            (options?.prefetchedDataPackage ? " (reusing prefetched data)" : "")
    );
    const startTime = Date.now();

    try {
        const file = await retryWithBackoff(() =>
            downloadBulkPopulatedTemplate
                .execute(moduleName, orgUnitIds, years, fileType, downloadType, options)
                .toPromise()
        );

        const bytes = new Uint8Array(await file.arrayBuffer());
        const filePath = path.join(outputDir, fileName);
        writeFileSync(filePath, bytes);

        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        console.info(`DONE ${fileName} (${bytes.byteLength} bytes) in ${elapsedSeconds}s`);
        recordOutcome("SUCCEEDED", fileType, label, periodLabel, fileName);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (message === NO_CALCULATED_DATA_AVAILABLE) {
            // Expected, not an error: no calculated data exists for ANY of the selected countries in
            // this period. Calculated consumption is derived (generated by the calculation from raw
            // uploads), so it is simply absent when the calculation hasn't run/produced results for
            // this period. describeProgramTarget names the EXACT program/stage that is empty so there
            // is no ambiguity (substance-calculated is a separate program; product-calculated is a
            // stage inside the product program). The "Countries with data: 0/N" line above shows scope.
            const target = describeProgramTarget(moduleName, fileType, downloadType);
            log(
                `Skipping ${fileType}/${label}/${periodLabel}: NO DATA in ${target} for any of the ` +
                    `${orgUnitIds.length} selected countries in ${periodLabel}. This is expected when the ` +
                    `consumption calculation hasn't been run for this period — it is not a fetch failure.`,
                LogLevel.WARN
            );
            recordOutcome(
                "SKIPPED",
                fileType,
                label,
                periodLabel,
                fileName,
                `No data in ${target} for any of the ${orgUnitIds.length} selected countries in ${periodLabel}`
            );
            return;
        }

        if (message.startsWith(TOO_MANY_ROWS)) {
            log(`${fileType}/${label}/${periodLabel}: ${message}`, LogLevel.ERROR);
            recordOutcome(
                "FAILED",
                fileType,
                label,
                periodLabel,
                fileName,
                "Exceeds Excel row limit — split the run further (e.g. fewer countries per run)"
            );
            return;
        }

        log(`Error downloading ${fileType}/${label}/${periodLabel}: ${message}`, LogLevel.ERROR);
        recordOutcome("FAILED", fileType, label, periodLabel, fileName, message);
    }
}

async function main(): Promise<void> {
    const startTime = Date.now();

    console.info(`DHIS2 instance: ${process.env.REACT_APP_DHIS2_BASE_URL ?? "(unset)"} (env label: ${envLabel})`);
    console.info(`Output folder: ${outputDir}`);
    console.info(`Log file: ${logFilePath}`);
    console.info(`Progress report: ${progressFilePath}`);
    const heapLimitGb = v8.getHeapStatistics().heap_size_limit / 1024 ** 3;
    console.info(
        `Node heap limit: ${heapLimitGb.toFixed(1)} GB` +
            (heapLimitGb < 6
                ? " — low; set NODE_OPTIONS=--max-old-space-size=8192 if a large run runs out of memory"
                : "")
    );

    await setupNodeGlobals();
    await initializeGlobals();

    const useAllOrgUnits = ORG_UNIT_CODES.length === 0;
    const autoDetectYears = YEARS.length === 0;
    const orgUnitIds = useAllOrgUnits
        ? Object.values(orgUnits)
        : ORG_UNIT_CODES.map(code => {
              const id = orgUnits[code];
              if (!id) throw new Error(`Unknown org unit code: ${code}`);
              return id;
          });

    // orgUnits is code -> id; invert it for progress logging, which only has the id (see the
    // per-org-unit fetch loops in DownloadTemplateDefaultRepository).
    const idToCode: Record<string, string> = Object.fromEntries(
        Object.entries(orgUnits).map(([code, id]) => [id, code])
    );

    log(
        useAllOrgUnits
            ? `ORG_UNIT_CODES is empty — considering all ${orgUnitIds.length} known org units before coverage filtering.`
            : `Considering ${orgUnitIds.length} selected org unit(s) before coverage filtering.`
    );

    // Downloading every country unfiltered would be extremely slow and mostly wasted work, so
    // coverage filtering is mandatory (not just opt-in) once ORG_UNIT_CODES is left empty.
    if (useAllOrgUnits && !PRUNE_BY_COVERAGE) {
        log("PRUNE_BY_COVERAGE is false but ORG_UNIT_CODES is empty — forcing coverage filtering on.", LogLevel.WARN);
    }
    const pruneByCoverage = PRUNE_BY_COVERAGE || useAllOrgUnits;

    // One cheap lookup up front, reused for two things: which candidate countries actually have
    // product/substance uploads (to skip per-country fetches that return nothing), and which years
    // exist (to auto-populate YEARS when empty). Fetched only if either use needs it.
    const metadata = pruneByCoverage || autoDetectYears ? await fetchAmcUploadMetadata() : null;
    const coverage = pruneByCoverage ? metadata?.coverage ?? null : null;

    const resolvedYears = autoDetectYears ? metadata?.years ?? [] : YEARS;

    // Fail loudly rather than silently doing the wrong (huge/empty) thing:
    if (autoDetectYears && !metadata) {
        throw new Error(
            "YEARS is empty (auto-detect) but the upload metadata lookup failed — cannot determine which " +
                "years exist. Set YEARS explicitly, or fix the metadata lookup."
        );
    }
    if (resolvedYears.length === 0) {
        throw new Error(
            "No years to download — YEARS is empty and no AMC uploads were found in the system. " +
                "Set YEARS explicitly if this is unexpected."
        );
    }
    if (useAllOrgUnits && !coverage) {
        // pruneOrgUnits() falls back to the unfiltered list when coverage is null — fine for a small
        // hand-picked ORG_UNIT_CODES list, but silently attempting all ~200 countries unfiltered here
        // would recreate the exact slow, wasteful run this mode exists to avoid.
        throw new Error(
            "ORG_UNIT_CODES is empty (all-countries mode) but the coverage lookup failed — " +
                "refusing to download all known org units unfiltered. Fix the coverage lookup, or set " +
                "ORG_UNIT_CODES explicitly to run against a specific list of countries."
        );
    }

    if (autoDetectYears) {
        log(`YEARS is empty — auto-detected ${resolvedYears.length} year(s) from uploads: ${resolvedYears.join(", ")}`);
    }

    // Keep the DHIS2 session warm across the run (see reauthenticate).
    const authHeartbeat = setInterval(() => {
        void reauthenticate("heartbeat");
    }, AUTH_HEARTBEAT_INTERVAL);

    // Coverage-based org units and planned output files per file type are year-agnostic, so this is
    // computed ONCE here rather than inside the year loop below (avoids repeating the same coverage
    // lookup/log once per year chunk).
    const fileTypePlans = FILE_TYPES.map(fileType => {
        const fileTypeOrgUnitIds = pruneOrgUnits(fileType, orgUnitIds, coverage);
        const tasks = getDownloadTasks(fileType);
        if (fileTypeOrgUnitIds.length === 0) {
            log(`No candidate country has ${fileType.toLowerCase()} data — skipping ${fileType}.`, LogLevel.WARN);
        }
        return { fileType, fileTypeOrgUnitIds, tasks };
    });

    // One file-set per year (CHUNK_BY_YEAR) bounds peak memory to roughly 1/N of an all-years fetch
    // and keeps every sheet under Excel's row cap — see the CHUNK_BY_YEAR config comment. With
    // chunking off there is a single "chunk" containing every year (today's original all-years-in-
    // one-file behaviour, labelled ALLYEARS).
    const yearChunks: string[][] = CHUNK_BY_YEAR ? resolvedYears.map(year => [year]) : [resolvedYears];

    for (const [chunkIndex, chunkYears] of yearChunks.entries()) {
        if (fatalAuthErrorMessage) break;

        const periodLabel = chunkYears.length === 1 ? chunkYears.join("") : "ALLYEARS";
        const chunkStartTime = Date.now();
        log(`=== ${periodLabel} (${chunkIndex + 1}/${yearChunks.length}) ===`);

        for (const { fileType, fileTypeOrgUnitIds, tasks } of fileTypePlans) {
            if (fatalAuthErrorMessage) break;

            if (fileTypeOrgUnitIds.length === 0) {
                recordOutcomeForTasks("SKIPPED", fileType, tasks, periodLabel, "No countries with this data type");
                continue;
            }

            // Cheap, rough size expectation from the uploads program's own row counts (see
            // fetchAmcUploadMetadata) — an upper-bound estimate, not the exact count the fetch below
            // will produce, but useful to flag an unusually large year before waiting on the real fetch.
            const estimatedRows = chunkYears.reduce(
                (sum, year) => sum + (metadata?.rowEstimates[fileType][year] ?? 0),
                0
            );
            if (estimatedRows > 0) {
                log(
                    `${periodLabel} ${fileType}: ~${estimatedRows.toLocaleString()} uploaded rows reported ` +
                        `system-wide (estimate, not the exact event count)`
                );
            }

            // PRODUCT SUBMITTED and CALCULATED are the same DHIS2 program — they differ only by
            // programStage, which is applied when the workbook is populated, not when data is fetched
            // (see fillTrackerEventRows in ExcelBuilder). So the org-unit fetch (the slow part) is done
            // ONCE per year chunk here and reused for every PRODUCT output in that chunk. SUBSTANCE
            // types are genuinely different programs, so they keep independent fetches.
            //
            // NOTE: with COMBINE_PRODUCT_STAGES = true (the default) `tasks` holds a single COMBINED
            // entry, so there is only one consumer and this prefetch saves nothing — the two
            // mechanisms solve the same double-fetch problem independently. It earns its keep only
            // when COMBINE_PRODUCT_STAGES is false (two tasks, one fetch). Kept for that mode; don't
            // read it as load-bearing in the default configuration.
            let prefetchedDataPackage: DataPackage | undefined;
            if (fileType === "PRODUCT") {
                try {
                    prefetchedDataPackage = await retryWithBackoff(() =>
                        downloadBulkPopulatedTemplate
                            .prefetchDataPackage(
                                moduleName,
                                fileTypeOrgUnitIds,
                                chunkYears,
                                fileType,
                                FETCH_CONCURRENCY,
                                idToCode
                            )
                            .toPromise()
                    );
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    const reason = message.startsWith(TOO_MANY_ROWS)
                        ? "Exceeds Excel row limit — split the run further (e.g. fewer countries per run)"
                        : message;
                    log(
                        `Error prefetching PRODUCT data for ${periodLabel} (shared by all PRODUCT outputs): ${message}`,
                        LogLevel.ERROR
                    );
                    recordOutcomeForTasks("FAILED", fileType, tasks, periodLabel, reason);
                    continue;
                }
            }

            for (const task of tasks) {
                if (fatalAuthErrorMessage) {
                    log(`Aborting — ${fatalAuthErrorMessage}`, LogLevel.ERROR);
                    break;
                }
                await downloadCombination(fileType, task, fileTypeOrgUnitIds, chunkYears, periodLabel, {
                    fetchConcurrency: FETCH_CONCURRENCY,
                    prefetchedDataPackage,
                    orgUnitLabels: idToCode,
                });
            }
            if (fatalAuthErrorMessage) break;
        }

        const chunkElapsedSeconds = Math.floor((Date.now() - chunkStartTime) / 1000);
        log(`${periodLabel} done in ${chunkElapsedSeconds}s`);
    }

    clearInterval(authHeartbeat);

    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    console.info(`Bulk download completed in ${elapsedSeconds} seconds`);
    console.info(`Output folder: ${outputDir}`);
    console.info(`Log file: ${logFilePath}`);
    console.info(`Progress report: ${progressFilePath}`);
}

main().catch(err => {
    console.error("Fatal error occurred:", err.message);
    process.exit(1);
});

/*
================================================================
AMR - Individual / AMR - Fungal bulk line-list export (streaming CSV)
================================================================
This script exports AMR - Individual / AMR - Fungal Tracker line-list (case/isolate) data —
NOT AMC/AMU antimicrobial-consumption data. It shares no submitted/calculated or product/substance
concepts with the AMC bulk script (src/scripts/bulkDownloadAMUFiles.ts); this file intentionally does
not reuse "AMU"/"AMC" naming anywhere.

Data model (verified against the live import/validation code — see the design plan for full citations):
  - One tracker program (mMAj6Gofe49) with two program STAGES, selected by module name:
      AMR - Individual -> stage KCmWZD8qoAk
      AMR - Fungal     -> stage ysGSonDq9Bc
  - Each row emitted by this script corresponds to exactly one EVENT in the selected stage — never a
    TEI. A TEI with zero matching-stage events contributes nothing; a TEI with multiple matching-stage
    events contributes multiple rows. This is deliberate (see "event-page-first" architecture below):
    an earlier bulk-download script for a different module did not correctly account for program
    stages, and this script is built specifically to avoid repeating that mistake.
  - The event's own occurredAt (the specimen/sample date) is the authoritative reporting year — verified
    against RISIndividualFungalFileValidations.checkPeriod/checkSpecimenDate, which enforce
    YEAR == reporting period == specimen-date year. Filtering/chunking by this date is therefore safe.
  - The round-trippable column contract is module.customDataColumns (same source the live upload
    validate/import flow uses) — headers are exactly these keys, in this order, values as stored DHIS2
    codes. One attribute is ORGANISATION_UNIT-typed (COUNTRY): DHIS2 stores an org-unit uid there, but
    the upload CSV expects the org-unit CODE, so this export reverse-maps uid -> code for any
    ORGANISATION_UNIT-typed attribute — getting this wrong would silently break re-import.

Architecture ("event-page-first", chosen over a country/year attribute pre-pass):
  1. Stream events for (program, SELECTED STAGE, one org unit, one year) — server-side filtered, so
     stage-mixing is structurally impossible and year filtering is exact.
  2. Per page, hydrate TEI attributes ONLY for the trackedEntity ids appearing on that page (chunked
     by-id fetch, small bounded LRU cache across pages). Attributes are therefore fetched for exactly
     the TEIs being exported, never a superset, and every exported event's TEI is hydrated by
     construction (no enrollment-date window, no backfill edge case).
  3. Join + write one CSV row per event immediately, respecting stream backpressure, then discard the
     page. Peak memory is bounded to ~one page, not the dataset.
*/

import { D2Api } from "@eyeseetea/d2-api/2.34";
import dotenv from "dotenv";
import _ from "lodash";
import { writeFileSync, appendFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import v8 from "node:v8";

import { getD2APiFromInstance } from "../utils/d2-api";
import { getInstance, warmUpSession } from "./common";
import { isRetryableError, promiseMapConcurrent, retryAsync } from "../utils/promises";
import { setupConsoleLogger } from "../utils/logger";

import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { GlassModuleDefaultRepository } from "../data/repositories/GlassModuleDefaultRepository";
import { MODULE_NAMES, GlassModuleName } from "../domain/entities/GlassModule";
import { GlassUploadsStatus } from "../domain/entities/GlassUploads";
import {
    AMR_GLASS_PROE_UPLOADS_PROGRAM_ID,
    getValueById,
    uploadsDHIS2Ids,
} from "../data/repositories/GlassUploadsProgramRepository";
import { CsvStreamWriter, escapeCsvField } from "./utils/csvStreamWriter";

// Load .env.local first, then .env — dotenv never overrides an already-set key, so this gives
// .env.local precedence (matching Create React App's precedence, which is where credentials like
// REACT_APP_DHIS2_TOKEN_PROD are kept for this repo). `-r dotenv/config` in the npm script only loads
// .env, so without this the token in .env.local would be invisible to the script.
dotenv.config({ path: ".env.local" });
dotenv.config();

/*
================================================================
CONFIG — edit before each run
================================================================
*/

// Which module to export. Toggle to MODULE_NAMES.AMR_FUNGAL for the Fungal/Candida stage. A single run
// always exports exactly one module/stage — Individual and Fungal are never combined into one file.
const MODULE_NAME: GlassModuleName = MODULE_NAMES.AMR_INDIVIDUAL;

// DHIS2 org unit codes (ISO/M49 country codes) to include. Leave EMPTY to consider every country —
// coverage-pruned (see PRUNE_BY_COVERAGE) so empty country/year combinations are skipped by default.
const ORG_UNIT_CODES: string[] = [];

// Years to export. Leave EMPTY to auto-detect every year present in the system (from the coverage
// lookup below). Explicit years need not be contiguous, e.g. ["2019","2021","2023"].
const YEARS: string[] = [];

// COUNTRY_YEAR (default, safest): one CSV per (country, year) — smallest files, independently
// restartable, easiest to audit. YEAR/COUNTRY/SINGLE share one file across multiple export units and
// force FETCH_CONCURRENCY to 1 to guarantee a shared stream is never written by concurrent workers.
type OutputGranularity = "COUNTRY_YEAR" | "YEAR" | "COUNTRY" | "SINGLE";
const OUTPUT_GRANULARITY: OutputGranularity = "COUNTRY_YEAR";

// When true (default), country/year combinations with no coverage evidence and not explicitly
// requested (via ORG_UNIT_CODES/YEARS) are marked SKIPPED without ever calling the tracker API for
// them. Coverage is planning/pruning input only — never a reason to drop data that IS requested; see
// the coverage-vs-export-mismatch handling in runUnit().
const PRUNE_BY_COVERAGE = true;

// If a unit is SKIPPED by coverage, by default no file is written at all. Set true to still write a
// header-only CSV (no tracker fetch) for pipeline consistency, with the skip reason recorded.
const WRITE_EMPTY_FILES = false;

// Max concurrent per-country fetches. Only used in COUNTRY_YEAR mode, where each unit owns its own
// file (safe to parallelize). Forced to 1 for YEAR/COUNTRY/SINGLE, where multiple units share one
// output stream (see Point 9 of the design plan — correctness over parallel speed for shared files).
const FETCH_CONCURRENCY = 6;

// Tracker API page size for the event stream (proven value from the AMC bulk script).
const EVENT_PAGE_SIZE = 1000;
// Max distinct trackedEntity ids hydrated in one by-id attribute-fetch request.
const HYDRATION_CHUNK_SIZE = 250;
// Bounded LRU cache size for hydrated TEI attributes, so memory never grows with total rows exported.
const HYDRATION_CACHE_SIZE = 5000;
// Page size for the coverage/uploads-program discovery query.
const COVERAGE_PAGE_SIZE = 500;

// Plan the run (module/stage/column resolution, coverage discovery, planned unit list, manifest) and
// exit WITHOUT fetching any tracker data or writing any data CSV. Use this to review scope first.
const DRY_RUN = false;

// Diagnostic only, default off: additionally scans every TEI id for each exported country (no stage
// filter) to compute the "TEIs with zero matching selected-stage events" summary metric, which cannot
// be derived from the event stream alone (a TEI with no matching event never appears in it). Adds one
// extra paginated ids-only query per country and holds that country's TEI-id set in memory for the
// diff — bounded per-country, not per-run, and only paid when explicitly requested.
const FULL_SCAN = false;

// Set to a PRIOR run's output folder path to resume it: reopens that folder (no new timestamp), takes
// its manifest as the authoritative planned-unit list, skips units already SUCCEEDED (verified against
// both the manifest's recorded outcome and the final output file's presence), retries
// FAILED/PARTIAL/interrupted units, and appends to the same progress CSV / manifest. Leave undefined
// for a normal run (always creates a fresh timestamped folder).
const RESUME_FROM: string | undefined = undefined;

// Resume never overwrites a unit already recorded as SUCCEEDED unless this is true.
const OVERWRITE = false;

// Prepend a UTF-8 BOM to CSVs (Excel-friendliness). Off by default; harmless either way on re-import.
const WRITE_BOM = false;

// Hardcoded fallback program/stage ids (from ImportRISIndividualFungalFile.ts / common.ts). The module
// datastore config (module.programs?.[0]) is preferred when present — same resolution order as the
// live import path (ImportPrimaryFileUseCase.tsx) — so this script targets whatever the instance is
// actually configured to import into, not a stale hardcoded assumption.
const AMR_INDIVIDUAL_PROGRAM_ID = "mMAj6Gofe49";
const AMR_DATA_PROGRAM_STAGE_ID = "KCmWZD8qoAk";
const AMR_FUNGAL_PROGRAM_STAGE_ID = "ysGSonDq9Bc";

// Statuses that mean the upload's raw data actually made it into the tracker (coverage evidence).
const COVERAGE_STATUSES: GlassUploadsStatus[] = ["IMPORTED", "VALIDATED", "COMPLETED"];

// Key columns checked for emptiness per row (anomaly diagnostics only — never blocks emission).
const KEY_COLUMNS = ["COUNTRY", "YEAR", "SAMPLE_DATE"];

let api!: D2Api;
let baseUrl = "";
let orgUnits: { [code: string]: string } = {};
let idToCode: { [id: string]: string } = {};

let authPromise: Promise<void> | null = null;
let lastAuthTime: number | null = null;
const AUTH_COOLDOWN_PERIOD = 60000;
const AUTH_HEARTBEAT_INTERVAL = 10 * 60 * 1000;
let fatalAuthErrorMessage: string | null = null;

/*
================================================================
Env label, naming (Point 1) — algorithmic, no manual hostname table
================================================================
*/

function deriveEnvLabel(rawUrl: string): string {
    try {
        const url = new URL(rawUrl);
        const hostPrefix = url.hostname.split(".")[0] ?? "";
        const pathTail = url.pathname.replace(/^\/+|\/+$/g, "").replace(/\//g, "-");
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

// "AMR - Individual" -> "AMR-Individual"; "AMR - Fungal" -> "AMR-Fungal".
function sanitizeModuleLabel(moduleName: string): string {
    return moduleName.replace(/\s*-\s*/g, "-").replace(/\s+/g, "");
}

/*
================================================================
Logging — console override mirrors bulkDownloadAMUFiles.ts
================================================================
*/

enum LogLevel {
    INFO = "info",
    WARN = "warn",
    ERROR = "error",
}

let logFilePath = "";
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;

function getTimestamp(): string {
    return new Date().toLocaleString();
}

function serializeLogArg(arg: unknown): string {
    if (typeof arg === "string") return arg;
    if (arg instanceof Error) return arg.stack ?? String(arg);
    try {
        return JSON.stringify(arg, (_key, value) => (value instanceof Error ? value.stack ?? String(value) : value));
    } catch {
        return String(arg);
    }
}

function appendConsoleToLogFile(args: unknown[]): void {
    if (!logFilePath) return;
    try {
        appendFileSync(logFilePath, args.map(serializeLogArg).join(" ") + "\n");
    } catch {
        // ignore logfile write failures
    }
}

function installConsoleCapture(): void {
    console.log = (...args: unknown[]) => {
        const stamped = [`[${getTimestamp()}]`, ...args];
        originalLog(...stamped);
        appendConsoleToLogFile(stamped);
    };
    console.error = (...args: unknown[]) => {
        const stamped = [`[${getTimestamp()}]`, ...args];
        originalError(...stamped);
        appendConsoleToLogFile(stamped);
    };
    console.warn = (...args: unknown[]) => {
        const stamped = [`[${getTimestamp()}]`, ...args];
        originalWarn(...stamped);
        appendConsoleToLogFile(stamped);
    };
    console.info = (...args: unknown[]) => {
        const stamped = [`[${getTimestamp()}]`, ...args];
        originalInfo(...stamped);
        appendConsoleToLogFile(stamped);
    };
}

function log(message: string, level: LogLevel = LogLevel.INFO): void {
    switch (level) {
        case LogLevel.ERROR:
            console.error(`[ERROR] ${message}`);
            break;
        case LogLevel.WARN:
            console.warn(`[WARN] ${message}`);
            break;
        default:
            console.log(`[INFO] ${message}`);
            break;
    }
}

/*
================================================================
Auth / node globals — mirrors bulkDownloadAMUFiles.ts
================================================================
*/

async function setupNodeGlobals(): Promise<void> {
    const g = globalThis as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (typeof g.Blob !== "function" || typeof g.File !== "function" || typeof g.FormData !== "function") {
        const { Blob: PBlob, File: PFile, FormData: PFormData } = await import("formdata-node");
        if (typeof g.Blob !== "function") g.Blob = PBlob;
        if (typeof g.File !== "function") g.File = PFile;
        if (typeof g.FormData !== "function") g.FormData = PFormData;
    }
    if (typeof g._ === "undefined") {
        const lodashModule = await import("lodash");
        g._ = (lodashModule as any).default ?? lodashModule; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
}

function getEnvVars(): { url: string; token?: string; auth?: { username: string; password: string } } {
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

    if (token) return { url: process.env.REACT_APP_DHIS2_BASE_URL, token };

    const auth = process.env.REACT_APP_DHIS2_AUTH!;
    const username = auth.split(":")[0] ?? "";
    const password = auth.split(":")[1] ?? "";
    if (!username || !password) throw new Error("REACT_APP_DHIS2_AUTH must be in the format 'username:password'");
    return { url: process.env.REACT_APP_DHIS2_BASE_URL, auth: { username, password } };
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
            fatalAuthErrorMessage = `Authentication failed during session refresh (${reason}): ${message}. Aborting the remaining export.`;
        }
    } finally {
        authPromise = null;
    }
}

// Page-level retry (exponential backoff via retryAsync) with an auth-refresh hook on the way out of
// each failed attempt. Deliberately no outer "retry the whole unit" layer: unlike the AMC script (which
// only ever writes a file once fully built in memory, so a whole-operation retry was harmless), this
// script streams rows directly to disk — retrying a whole partially-written unit would risk
// duplicated/corrupted output. A page that exhausts its retries propagates as a fatal error for that
// unit (marked FAILED/PARTIAL, `.partial` file left behind); re-running via RESUME_FROM is the
// supported way to retry a failed unit, not an automatic in-run restart.
async function fetchPageWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    return retryAsync(
        async () => {
            try {
                return await operation();
            } catch (error) {
                if (isAuthError(error)) {
                    await reauthenticate("page-retry");
                    if (fatalAuthErrorMessage) throw new Error(fatalAuthErrorMessage);
                }
                throw error;
            }
        },
        {
            attempts: 3,
            baseDelayMs: 2000,
            // retryAsync's default treats 401/403 as non-retryable, which is right for a caller that
            // cannot do anything about them. Here it would be wrong: the wrapper above has just
            // refreshed the session, so the *next* attempt is precisely what makes the refresh
            // worth doing. Allow auth errors through, and defer to the default for everything else.
            shouldRetry: error => isAuthError(error) || isRetryableError(error),
        }
    );
}

async function initializeOrgUnits(): Promise<{ [code: string]: string }> {
    const orgUnitsObject = await api.models.organisationUnits
        .get({
            fields: { id: true, name: true, code: true },
            filter: { level: { eq: "3" } },
            paging: false,
        })
        .getData()
        .catch(error => {
            console.error(`Error thrown when fetching countries: ${error}`);
            throw error;
        });

    // Kosovo is not a level-3 org unit in the metadata tree — added explicitly (same as the AMC/AMR
    // upload scripts) so it can be referenced by code like any other country.
    orgUnitsObject.objects.push({ id: "I8AMbKhxlj9", name: "Kosovo", code: "601624" });

    return orgUnitsObject.objects.reduce<{ [code: string]: string }>((map, ou) => {
        if (ou.code) map[ou.code] = ou.id;
        return map;
    }, {});
}

/*
================================================================
Module / program / stage / column metadata resolution (Point 2 — program-stage correctness)
================================================================
*/

interface CodedMeta {
    id: string;
    code: string;
    name: string;
    valueType: string;
}

interface ProgramStageMeta {
    id: string;
    name: string;
    dataElements: CodedMeta[];
}

interface ProgramMeta {
    programId: string;
    trackedEntityType?: string;
    attributes: CodedMeta[];
    stages: ProgramStageMeta[];
}

function withCode<T extends { code?: string }>(entries: T[], kind: string): (T & { code: string })[] {
    const result: (T & { code: string })[] = [];
    for (const entry of entries) {
        if (entry.code) {
            result.push(entry as T & { code: string });
        } else {
            log(
                `Program metadata: a ${kind} has no code and can never be referenced by a customDataColumns key — ignoring it.`,
                LogLevel.WARN
            );
        }
    }
    return result;
}

// Deliberately NOT reusing TrackerDefaultRepository.getProgramMetadata: that helper already narrows to
// a single stage's data elements and discards stage names, which is too little visibility for the
// program-stage audit this script requires (Point 2 explicitly asks to confirm every stage, its name,
// and which one is selected). This queries the same underlying endpoint but keeps ALL stages.
async function fetchProgramMetadata(programId: string): Promise<ProgramMeta> {
    const response = await api.models.programs
        .get({
            fields: {
                id: true,
                trackedEntityType: { id: true },
                programStages: {
                    id: true,
                    name: true,
                    programStageDataElements: { dataElement: { id: true, name: true, code: true, valueType: true } },
                },
                programTrackedEntityAttributes: {
                    trackedEntityAttribute: { id: true, name: true, code: true, valueType: true },
                },
            },
            filter: { id: { eq: programId } },
        })
        .getData();

    const program = response.objects[0];
    if (!program) throw new Error(`Program ${programId} not found on this DHIS2 instance.`);

    return {
        programId: program.id,
        trackedEntityType: program.trackedEntityType?.id,
        attributes: withCode(
            program.programTrackedEntityAttributes.map(a => a.trackedEntityAttribute),
            "tracked entity attribute"
        ),
        stages: program.programStages.map(ps => ({
            id: ps.id,
            name: ps.name,
            dataElements: withCode(
                ps.programStageDataElements.map(d => d.dataElement),
                `data element on stage "${ps.name}"`
            ),
        })),
    };
}

type ColumnSource =
    | { key: string; kind: "attribute"; meta: CodedMeta }
    | { key: string; kind: "dataElement"; meta: CodedMeta }
    | { key: string; kind: "unmapped" };

interface ResolvedContext {
    moduleId: string;
    moduleName: GlassModuleName;
    moduleLabel: string;
    customDataColumns: string[];
    programId: string;
    programStageId: string;
    programStageName: string;
    columnSources: ColumnSource[];
    attributeIdToMeta: Map<string, CodedMeta>;
}

async function resolveContext(): Promise<ResolvedContext> {
    const instance = getInstance(getEnvVars());
    const dataStoreClient = new DataStoreClient(instance);
    const glassModuleRepository = new GlassModuleDefaultRepository(dataStoreClient);

    const glassModule = await glassModuleRepository.getByName(MODULE_NAME).toPromise();
    const moduleId = glassModule.id;
    // customDataColumns entries are {key,type,value?}; the export only needs the ordered key list —
    // the header/round-trip contract is the key set and order, not the (upload-time-only) type/value.
    const customDataColumns = (glassModule.customDataColumns ?? []).map(c => c.key);
    if (customDataColumns.length === 0) {
        throw new Error(
            `Module "${MODULE_NAME}" has no customDataColumns configured in the datastore — cannot build a round-trippable export without the column contract.`
        );
    }

    // Same resolution order as the live import path (ImportPrimaryFileUseCase.tsx / cliAsyncUploads.ts):
    // prefer the module's own datastore-configured program/stage, falling back to the hardcoded ids
    // only when the module has no override. Bracket indexing (not Array.prototype.at) matches the
    // proven-safe-under-ts-node convention already used by cliAsyncUploads.ts.
    const configuredProgram = glassModule.programs?.[0];
    const fallbackStageId =
        MODULE_NAME === MODULE_NAMES.AMR_INDIVIDUAL ? AMR_DATA_PROGRAM_STAGE_ID : AMR_FUNGAL_PROGRAM_STAGE_ID;
    const programId = configuredProgram?.id ?? AMR_INDIVIDUAL_PROGRAM_ID;
    const programStageId = configuredProgram?.programStageId ?? fallbackStageId;
    log(
        `Resolved program/stage from ${
            configuredProgram ? "module datastore config (module.programs[0])" : "hardcoded fallback"
        }: program ${programId}, stage ${programStageId}`
    );

    const programMeta = await fetchProgramMetadata(programId);
    console.info(
        `Program ${programId} has ${programMeta.stages.length} stage(s): ${programMeta.stages
            .map(s => `"${s.name}" (${s.id})`)
            .join(", ")}`
    );
    const selectedStage = programMeta.stages.find(s => s.id === programStageId);
    if (!selectedStage) {
        throw new Error(
            `Selected program stage ${programStageId} was not found among program ${programId}'s stages — ` +
                `refusing to export (this would risk exporting the wrong stage, or silently exporting nothing).`
        );
    }
    console.info(`Selected stage: "${selectedStage.name}" (${selectedStage.id}) for module "${MODULE_NAME}"`);

    const attributesByCode = new Map(programMeta.attributes.map(a => [a.code, a]));
    const dataElementsByCode = new Map(selectedStage.dataElements.map(d => [d.code, d]));
    const attributeIdToMeta = new Map(programMeta.attributes.map(a => [a.id, a]));

    const columnSources: ColumnSource[] = customDataColumns.map(key => {
        const attr = attributesByCode.get(key);
        if (attr) return { key, kind: "attribute", meta: attr };
        const de = dataElementsByCode.get(key);
        if (de) return { key, kind: "dataElement", meta: de };
        return { key, kind: "unmapped" };
    });
    const unmapped = columnSources.filter(c => c.kind === "unmapped");
    if (unmapped.length > 0) {
        log(
            `${unmapped.length} customDataColumns key(s) match neither a program attribute nor a "${selectedStage.name}" ` +
                `stage data element by code — these columns will always be empty in the export: ${unmapped
                    .map(c => c.key)
                    .join(", ")}`,
            LogLevel.WARN
        );
    }

    return {
        moduleId,
        moduleName: MODULE_NAME,
        moduleLabel: sanitizeModuleLabel(MODULE_NAME),
        customDataColumns,
        programId,
        programStageId,
        programStageName: selectedStage.name,
        columnSources,
        attributeIdToMeta,
    };
}

/*
================================================================
Coverage discovery (Point 5 — planning only, never a data-loss gate)
================================================================
*/

interface CoverageInfo {
    orgUnitYears: Set<string>; // key `${orgUnitId}|${year}`
    years: string[];
    rowEstimates: Map<string, number>; // key `${orgUnitId}|${year}`
}

async function fetchCoverage(moduleId: string): Promise<CoverageInfo | null> {
    const orgUnitYears = new Set<string>();
    const years = new Set<string>();
    const rowEstimates = new Map<string, number>();
    const coverageStatuses = new Set<string>(COVERAGE_STATUSES);

    let page = 1;
    let result;
    try {
        do {
            result = await api.tracker.events
                .get({
                    fields: { event: true, orgUnit: true, dataValues: { dataElement: true, value: true } },
                    program: AMR_GLASS_PROE_UPLOADS_PROGRAM_ID,
                    filter: `${uploadsDHIS2Ids.moduleId}:eq:${moduleId}`,
                    totalPages: true,
                    page,
                    pageSize: COVERAGE_PAGE_SIZE,
                })
                .getData();

            for (const event of result.instances) {
                const status = getValueById(event.dataValues, uploadsDHIS2Ids.status) ?? "";
                if (!coverageStatuses.has(status) || !event.orgUnit) continue;

                const year = (getValueById(event.dataValues, uploadsDHIS2Ids.period) ?? "").match(/\d{4}/)?.[0];
                if (!year) continue;

                const key = `${event.orgUnit}|${year}`;
                orgUnitYears.add(key);
                years.add(year);
                const rows = parseInt(getValueById(event.dataValues, uploadsDHIS2Ids.rows) ?? "0", 10);
                if (rows > 0) rowEstimates.set(key, (rowEstimates.get(key) ?? 0) + rows);
            }
            page++;
        } while (result.page < Math.ceil((result.total as number) / COVERAGE_PAGE_SIZE));

        return { orgUnitYears, years: [...years].sort(), rowEstimates };
    } catch (error) {
        log(`Coverage lookup failed (${error instanceof Error ? error.message : String(error)}).`, LogLevel.WARN);
        return null;
    }
}

/*
================================================================
Planning (Points 5, 10, 14)
================================================================
*/

type PlanSource = "explicit-config" | "coverage" | "fallback-discovery";

interface PlannedUnit {
    orgUnitId: string;
    orgUnitCode: string;
    year: string;
    planSource: PlanSource;
    estimatedRows?: number;
    plannedStatus: "PLANNED" | "SKIPPED";
    skipReason?: string;
    hasCoverageEvidence: boolean;
}

function buildPlan(params: {
    orgUnitIds: string[];
    years: string[];
    useAllOrgUnits: boolean;
    autoDetectYears: boolean;
    coverage: CoverageInfo | null;
}): PlannedUnit[] {
    const { orgUnitIds, years, useAllOrgUnits, autoDetectYears, coverage } = params;
    const explicitlyRequested = !useAllOrgUnits || !autoDetectYears;
    const planSource: PlanSource =
        !useAllOrgUnits && !autoDetectYears ? "explicit-config" : coverage ? "coverage" : "fallback-discovery";

    const units: PlannedUnit[] = [];
    for (const orgUnitId of orgUnitIds) {
        for (const year of years) {
            const key = `${orgUnitId}|${year}`;
            const hasCoverageEvidence = coverage?.orgUnitYears.has(key) ?? false;
            const skip = PRUNE_BY_COVERAGE && coverage !== null && !hasCoverageEvidence && !explicitlyRequested;
            units.push({
                orgUnitId,
                orgUnitCode: idToCode[orgUnitId] ?? orgUnitId,
                year,
                planSource,
                estimatedRows: coverage?.rowEstimates.get(key),
                plannedStatus: skip ? "SKIPPED" : "PLANNED",
                skipReason: skip
                    ? "No coverage evidence for this country/year and not explicitly requested"
                    : undefined,
                hasCoverageEvidence,
            });
        }
    }
    return units;
}

/*
================================================================
Row resolution (Points 3, 4, 6 — event-authoritative emission, ORGANISATION_UNIT round-trip fix)
================================================================
*/

interface AmriEvent {
    event: string;
    trackedEntity?: string;
    programStage: string;
    occurredAt: string;
    enrollment: string;
    orgUnit: string;
    dataValues: { dataElement: string; value: string }[];
}

class BoundedCache<K, V> {
    private readonly map = new Map<K, V>();
    constructor(private readonly maxSize: number) {}

    get(key: K): V | undefined {
        const value = this.map.get(key);
        if (value !== undefined) {
            this.map.delete(key);
            this.map.set(key, value);
        }
        return value;
    }

    set(key: K, value: V): void {
        if (this.map.has(key)) this.map.delete(key);
        this.map.set(key, value);
        if (this.map.size > this.maxSize) {
            const oldestKey = this.map.keys().next().value;
            if (oldestKey !== undefined) this.map.delete(oldestKey);
        }
    }
}

interface Anomalies {
    duplicateEventIds: number;
    multiEventTeis: number;
    missingAttributesForEvent: number;
    unresolvedOrgUnitAttributeValues: number;
    missingTrackedEntity: number;
    missingEventId: number;
    missingKeyFieldCounts: Record<string, number>;
    coverageExportMismatches: string[];
    foundDataNotInCoverage: string[];
    zeroStageEventTeis: number | null; // null = not computed (FULL_SCAN off)
}

function createAnomalies(): Anomalies {
    return {
        duplicateEventIds: 0,
        multiEventTeis: 0,
        missingAttributesForEvent: 0,
        unresolvedOrgUnitAttributeValues: 0,
        missingTrackedEntity: 0,
        missingEventId: 0,
        missingKeyFieldCounts: Object.fromEntries(KEY_COLUMNS.map(k => [k, 0])),
        coverageExportMismatches: [],
        foundDataNotInCoverage: [],
        zeroStageEventTeis: FULL_SCAN ? 0 : null,
    };
}

function resolveRowValues(
    event: AmriEvent,
    attrByCode: Map<string, string>,
    columnSources: ColumnSource[],
    anomalies: Anomalies
): Map<string, string> {
    const dvById = new Map(event.dataValues.map(dv => [dv.dataElement, dv.value] as const));
    const resolved = new Map<string, string>();

    for (const source of columnSources) {
        if (source.kind === "attribute") {
            let value = attrByCode.get(source.meta.code) ?? "";
            if (source.meta.valueType === "ORGANISATION_UNIT" && value) {
                const code = idToCode[value];
                if (code) {
                    value = code;
                } else {
                    anomalies.unresolvedOrgUnitAttributeValues++;
                    console.warn(
                        `[export] Could not reverse-map ORGANISATION_UNIT attribute value "${value}" to a country code ` +
                            `(event ${event.event}) — writing the raw uid, which will NOT round-trip through re-import.`
                    );
                }
            }
            resolved.set(source.key, value);
        } else if (source.kind === "dataElement") {
            resolved.set(source.key, dvById.get(source.meta.id) ?? "");
        } else {
            resolved.set(source.key, "");
        }
    }
    return resolved;
}

function toRow(resolved: Map<string, string>, customDataColumns: string[]): string[] {
    return customDataColumns.map(key => resolved.get(key) ?? "");
}

function checkMissingKeyFields(
    resolved: Map<string, string>,
    teiId: string,
    eventId: string,
    anomalies: Anomalies
): void {
    for (const key of KEY_COLUMNS) {
        if (resolved.has(key) && !resolved.get(key)) {
            anomalies.missingKeyFieldCounts[key] = (anomalies.missingKeyFieldCounts[key] ?? 0) + 1;
        }
    }
    if (!teiId) anomalies.missingTrackedEntity++;
    if (!eventId) anomalies.missingEventId++;
}

/*
================================================================
Attribute hydration (event-page-first — Points 3, 6, 8)
================================================================
*/

const hydrationFields = {
    trackedEntity: true,
    attributes: true,
} as const;

async function hydrateAttributes(
    ids: string[],
    programId: string,
    attributeIdToMeta: Map<string, CodedMeta>,
    cache: BoundedCache<string, Map<string, string>>,
    anomalies: Anomalies
): Promise<Map<string, Map<string, string>>> {
    const result = new Map<string, Map<string, string>>();
    const missing: string[] = [];

    for (const id of ids) {
        const cached = cache.get(id);
        if (cached) result.set(id, cached);
        else missing.push(id);
    }

    for (const chunk of _.chunk(missing, HYDRATION_CHUNK_SIZE)) {
        if (chunk.length === 0) continue;
        const response = await fetchPageWithRetry(() =>
            api.tracker.trackedEntities
                .get({
                    trackedEntity: chunk.join(";"),
                    program: programId,
                    ouMode: "ALL",
                    fields: hydrationFields,
                    pageSize: chunk.length,
                })
                .getData()
        );

        for (const tei of response.instances) {
            const attrByCode = new Map<string, string>();
            for (const a of tei.attributes ?? []) {
                const meta = attributeIdToMeta.get(a.attribute);
                if (meta) attrByCode.set(meta.code, a.value ?? "");
            }
            cache.set(tei.trackedEntity, attrByCode);
            result.set(tei.trackedEntity, attrByCode);
        }
    }

    // A trackedEntity id referenced by an exported event but not returned by the by-id lookup (e.g. an
    // orphaned/deleted reference) must never silently drop the event — emit it with empty attributes
    // and flag the anomaly loudly instead.
    for (const id of ids) {
        if (!result.has(id)) {
            anomalies.missingAttributesForEvent++;
            result.set(id, new Map());
            console.warn(
                `[export] trackedEntity ${id} is referenced by an exported event but was not returned by the ` +
                    `attribute lookup — emitting the row with empty attribute values rather than dropping it.`
            );
        }
    }
    return result;
}

/*
================================================================
Event streaming (Point 2, 7 — server-side stage + year filter, page-by-page)
================================================================
*/

const eventFields = {
    event: true,
    trackedEntity: true,
    programStage: true,
    occurredAt: true,
    enrollment: true,
    orgUnit: true,
    dataValues: true,
} as const;

async function fetchEventsPage(params: {
    programId: string;
    programStageId: string;
    orgUnitId: string;
    year: string;
    page: number;
}): Promise<{ instances: AmriEvent[]; total: number | undefined; page: number }> {
    const { programId, programStageId, orgUnitId, year, page } = params;
    const result = await fetchPageWithRetry(() =>
        api.tracker.events
            .get({
                program: programId,
                programStage: programStageId,
                orgUnit: orgUnitId,
                occurredAfter: `${year}-01-01`,
                occurredBefore: `${year}-12-31`,
                fields: eventFields,
                totalPages: true,
                page,
                pageSize: EVENT_PAGE_SIZE,
            })
            .getData()
    );
    return { instances: result.instances as unknown as AmriEvent[], total: result.total, page: result.page };
}

/*
================================================================
Progress CSV / manifest (Points 12, 15)
================================================================
*/

interface UnitOutcomeRecord {
    orgUnitId: string;
    orgUnitCode: string;
    year: string;
    finalStatus: "SUCCEEDED" | "SKIPPED" | "FAILED" | "PARTIAL" | "WARNING";
    rowsWritten: number;
    pagesFetched: number;
    bytesWritten?: number;
    outputFile?: string;
    reason?: string;
    planSource: PlanSource;
    startTs: string;
    endTs: string;
}

const PROGRESS_CSV_HEADER =
    "module,programId,programStageId,orgUnitCode,orgUnitId,year,granularity,plannedStatus,finalStatus," +
    "rowsWritten,pagesFetched,bytesWritten,outputFile,planSource,reason,startTs,endTs";

function csvField(value: string | number | undefined): string {
    return escapeCsvField(value ?? "");
}

function appendProgressRow(
    progressFilePath: string,
    ctx: ResolvedContext,
    unit: PlannedUnit,
    outcome: UnitOutcomeRecord
): void {
    const row = [
        ctx.moduleName,
        ctx.programId,
        ctx.programStageId,
        unit.orgUnitCode,
        unit.orgUnitId,
        unit.year,
        OUTPUT_GRANULARITY,
        unit.plannedStatus,
        outcome.finalStatus,
        outcome.rowsWritten,
        outcome.pagesFetched,
        outcome.bytesWritten ?? "",
        outcome.outputFile ?? "",
        outcome.planSource,
        outcome.reason ?? "",
        outcome.startTs,
        outcome.endTs,
    ]
        .map(csvField)
        .join(",");
    appendFileSync(progressFilePath, row + "\n");
}

interface Manifest {
    runTimestamp: string;
    envLabel: string;
    instanceUrl: string;
    module: { name: string; id: string };
    program: { id: string };
    programStage: { id: string; name: string };
    customDataColumns: string[];
    granularity: OutputGranularity;
    plannedUnits: PlannedUnit[];
    unitOutcomes: Record<string, UnitOutcomeRecord>; // key `${orgUnitId}|${year}`
    summary?: Record<string, unknown>;
}

function unitKey(orgUnitId: string, year: string): string {
    return `${orgUnitId}|${year}`;
}

function writeManifest(manifestPath: string, manifest: Manifest): void {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

function loadManifest(manifestPath: string): Manifest {
    if (!existsSync(manifestPath)) {
        throw new Error(
            `RESUME_FROM manifest not found at ${manifestPath} — refusing to resume without a canonical plan.`
        );
    }
    return JSON.parse(readFileSync(manifestPath, "utf8"));
}

/*
================================================================
Run context (fresh vs resume) — Point 15
================================================================
*/

interface RunContext {
    outputDir: string;
    runTimestamp: string;
    envLabel: string;
    logFilePath: string;
    progressFilePath: string;
    manifestPath: string;
    resumedManifest?: Manifest;
}

function createFreshRunContext(moduleLabel: string, envLabel: string): RunContext {
    const runTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputDir = path.join(process.cwd(), `${moduleLabel}_bulk_download_${envLabel}_${runTimestamp}`);
    mkdirSync(outputDir, { recursive: true });
    return {
        outputDir,
        runTimestamp,
        envLabel,
        logFilePath: path.join(outputDir, `${moduleLabel}_bulk_download_log_${runTimestamp}.txt`),
        progressFilePath: path.join(outputDir, `${moduleLabel}_bulk_download_progress_${runTimestamp}.csv`),
        manifestPath: path.join(outputDir, `${moduleLabel}_bulk_download_manifest_${runTimestamp}.json`),
    };
}

function loadResumeContext(resumeFrom: string, moduleLabel: string): RunContext {
    if (!existsSync(resumeFrom)) throw new Error(`RESUME_FROM folder does not exist: ${resumeFrom}`);
    const manifestCandidates = readdirSync(resumeFrom).filter(f => f.endsWith(".json") && f.includes("manifest"));
    const manifestFile = manifestCandidates[0];
    if (!manifestFile) throw new Error(`No manifest JSON found in RESUME_FROM folder: ${resumeFrom}`);

    const manifestPath = path.join(resumeFrom, manifestFile);
    const resumedManifest = loadManifest(manifestPath);
    const runTimestamp = resumedManifest.runTimestamp;
    return {
        outputDir: resumeFrom,
        runTimestamp,
        envLabel: resumedManifest.envLabel,
        logFilePath: path.join(resumeFrom, `${moduleLabel}_bulk_download_log_${runTimestamp}.txt`),
        progressFilePath: path.join(resumeFrom, `${moduleLabel}_bulk_download_progress_${runTimestamp}.csv`),
        manifestPath,
        resumedManifest,
    };
}

/*
================================================================
Filenames (Point 1)
================================================================
*/

function outputKeyFor(unit: PlannedUnit): string {
    switch (OUTPUT_GRANULARITY) {
        case "COUNTRY_YEAR":
            return `${unit.orgUnitCode}_${unit.year}`;
        case "YEAR":
            return unit.year;
        case "COUNTRY":
            return unit.orgUnitCode;
        case "SINGLE":
            return "ALL";
    }
}

function dataFileName(moduleLabel: string, envLabel: string, runTimestamp: string, outputKey: string): string {
    return `${moduleLabel}_${outputKey}_${envLabel}_${runTimestamp}.csv`;
}

function auditFileName(dataFile: string): string {
    return dataFile.replace(/\.csv$/, "__audit.csv");
}

/*
================================================================
Single-unit export (Point 3, 4, 7, 13 — event-page-first streaming, one row per event)
================================================================
*/

const AUDIT_HEADERS = [
    "rowNumber",
    "trackedEntity",
    "enrollment",
    "event",
    "orgUnit",
    "program",
    "programStage",
    "occurredAt",
    "extractedAt",
    "sourceInstanceUrl",
];

interface UnitRunResult {
    rowsWritten: number;
    pagesFetched: number;
    hydratedTeiIds: Set<string>;
}

async function runUnit(
    unit: PlannedUnit,
    ctx: ResolvedContext,
    cache: BoundedCache<string, Map<string, string>>,
    mainWriter: CsvStreamWriter,
    auditWriter: CsvStreamWriter,
    anomalies: Anomalies
): Promise<UnitRunResult> {
    let rowsWritten = 0;
    let pagesFetched = 0;
    const eventCountByTei = new Map<string, number>();
    const seenEventIds = new Set<string>();
    const hydratedTeiIds = new Set<string>();

    let page = 1;
    let result: { instances: AmriEvent[]; total: number | undefined; page: number };
    do {
        result = await fetchEventsPage({
            programId: ctx.programId,
            programStageId: ctx.programStageId,
            orgUnitId: unit.orgUnitId,
            year: unit.year,
            page,
        });
        const { total } = result;
        if (total == null) {
            throw new Error(
                `Missing pagination total fetching events: program ${ctx.programId}, stage ${ctx.programStageId}, ` +
                    `orgUnit ${unit.orgUnitId} (${unit.orgUnitCode}), year ${unit.year}, page ${page}`
            );
        }
        if (total === 0) break;

        pagesFetched++;
        const ids = Array.from(
            new Set(result.instances.map(e => e.trackedEntity).filter((id): id is string => Boolean(id)))
        );
        const attrByTei = await hydrateAttributes(ids, ctx.programId, ctx.attributeIdToMeta, cache, anomalies);
        for (const id of ids) hydratedTeiIds.add(id);

        for (const event of result.instances) {
            // Defensive assert: the server-side programStage filter should already guarantee this. A
            // violation is treated as fatal for the unit rather than silently emitting a wrong-stage row
            // — this is precisely the class of mistake this script exists to avoid.
            if (event.programStage !== ctx.programStageId) {
                throw new Error(
                    `Event ${event.event} was returned with programStage ${event.programStage}, expected ` +
                        `${ctx.programStageId} — the server-side stage filter did not hold as expected. Aborting this unit.`
                );
            }

            if (seenEventIds.has(event.event)) {
                anomalies.duplicateEventIds++;
                console.warn(
                    `[export] Duplicate event id ${event.event} seen twice while fetching orgUnit ${unit.orgUnitCode}, ` +
                        `year ${unit.year} — emitting both rows rather than silently deduplicating.`
                );
            } else {
                seenEventIds.add(event.event);
            }

            const teiId = event.trackedEntity ?? "";
            const attrByCode = attrByTei.get(teiId) ?? new Map<string, string>();
            const resolved = resolveRowValues(event, attrByCode, ctx.columnSources, anomalies);
            checkMissingKeyFields(resolved, teiId, event.event, anomalies);

            await mainWriter.writeRow(toRow(resolved, ctx.customDataColumns));
            await auditWriter.writeRow([
                rowsWritten + 1,
                teiId,
                event.enrollment,
                event.event,
                event.orgUnit,
                ctx.programId,
                event.programStage,
                event.occurredAt,
                new Date().toISOString(),
                baseUrl,
            ]);
            rowsWritten++;

            eventCountByTei.set(teiId, (eventCountByTei.get(teiId) ?? 0) + 1);
        }
        page++;
    } while (result.page < Math.ceil((result.total as number) / EVENT_PAGE_SIZE));

    anomalies.multiEventTeis += [...eventCountByTei.values()].filter(count => count > 1).length;
    return { rowsWritten, pagesFetched, hydratedTeiIds };
}

/*
================================================================
FULL_SCAN diagnostic (Point 3 — "zero matching-stage events" metric)
================================================================
*/

async function scanAllTeiIdsForCountry(programId: string, orgUnitId: string): Promise<Set<string>> {
    const ids = new Set<string>();
    let page = 1;
    let result;
    do {
        result = await fetchPageWithRetry(() =>
            api.tracker.trackedEntities
                .get({
                    program: programId,
                    orgUnit: orgUnitId,
                    ouMode: "SELECTED",
                    fields: { trackedEntity: true },
                    totalPages: true,
                    page,
                    pageSize: EVENT_PAGE_SIZE,
                })
                .getData()
        );
        for (const tei of result.instances) ids.add(tei.trackedEntity);
        page++;
    } while (result.total != null && result.page < Math.ceil((result.total as number) / EVENT_PAGE_SIZE));
    return ids;
}

/*
================================================================
main()
================================================================
*/

async function main(): Promise<void> {
    const startTime = Date.now();

    await setupNodeGlobals();
    const instance = getInstance(getEnvVars());
    api = getD2APiFromInstance(instance);
    baseUrl = process.env.REACT_APP_DHIS2_BASE_URL ?? "";
    await warmUpSession(api);
    await setupConsoleLogger({ isDebug: false });

    const envLabel = deriveEnvLabel(baseUrl);
    const moduleLabel = sanitizeModuleLabel(MODULE_NAME);
    const runContext = RESUME_FROM
        ? loadResumeContext(RESUME_FROM, moduleLabel)
        : createFreshRunContext(moduleLabel, envLabel);
    const { outputDir, runTimestamp, progressFilePath, manifestPath } = runContext;

    logFilePath = runContext.logFilePath;
    installConsoleCapture();
    if (!existsSync(progressFilePath)) writeFileSync(progressFilePath, PROGRESS_CSV_HEADER + "\n");

    console.info(`DHIS2 instance: ${baseUrl} (env label: ${envLabel})`);
    console.info(`Module: ${MODULE_NAME}`);
    console.info(`Output folder: ${outputDir}${RESUME_FROM ? " (resumed)" : ""}`);
    console.info(`Log file: ${logFilePath}`);
    console.info(`Progress report: ${progressFilePath}`);
    console.info(`Manifest: ${manifestPath}`);
    const heapLimitGb = v8.getHeapStatistics().heap_size_limit / 1024 ** 3;
    console.info(
        `Node heap limit: ${heapLimitGb.toFixed(1)} GB (headroom only — this script streams to disk and does not ` +
            `depend on heap size for correctness)`
    );

    orgUnits = await initializeOrgUnits();
    idToCode = Object.fromEntries(Object.entries(orgUnits).map(([code, id]) => [id, code]));

    const ctx = await resolveContext();
    console.info(`Round-trippable columns (${ctx.customDataColumns.length}): ${ctx.customDataColumns.join(", ")}`);

    const useAllOrgUnits = ORG_UNIT_CODES.length === 0;
    const autoDetectYears = YEARS.length === 0;
    const orgUnitIds = useAllOrgUnits
        ? Object.values(orgUnits)
        : ORG_UNIT_CODES.map(code => {
              const id = orgUnits[code];
              if (!id) throw new Error(`Unknown org unit code: ${code}`);
              return id;
          });

    const coverage = await fetchCoverage(ctx.moduleId);
    const resolvedYears = autoDetectYears ? coverage?.years ?? [] : YEARS;

    if (autoDetectYears && !coverage) {
        throw new Error(
            "YEARS is empty (auto-detect) but the coverage lookup failed — set YEARS explicitly, or fix the coverage lookup."
        );
    }
    if (resolvedYears.length === 0) {
        throw new Error(
            "No years to export — YEARS is empty and no coverage was found. Set YEARS explicitly if this is unexpected."
        );
    }
    if (useAllOrgUnits && !coverage) {
        throw new Error(
            "ORG_UNIT_CODES is empty (all-countries mode) but the coverage lookup failed — refusing to export all " +
                "known org units unfiltered. Fix the coverage lookup, or set ORG_UNIT_CODES explicitly."
        );
    }

    const plannedUnits = buildPlan({ orgUnitIds, years: resolvedYears, useAllOrgUnits, autoDetectYears, coverage });
    const plannedCount = plannedUnits.filter(u => u.plannedStatus === "PLANNED").length;
    const skippedCount = plannedUnits.filter(u => u.plannedStatus === "SKIPPED").length;
    log(`Planned ${plannedUnits.length} unit(s): ${plannedCount} to export, ${skippedCount} skipped by coverage.`);

    const manifest: Manifest = runContext.resumedManifest ?? {
        runTimestamp,
        envLabel,
        instanceUrl: baseUrl,
        module: { name: ctx.moduleName, id: ctx.moduleId },
        program: { id: ctx.programId },
        programStage: { id: ctx.programStageId, name: ctx.programStageName },
        customDataColumns: ctx.customDataColumns,
        granularity: OUTPUT_GRANULARITY,
        plannedUnits,
        unitOutcomes: {},
    };
    if (!runContext.resumedManifest) writeManifest(manifestPath, manifest);

    if (DRY_RUN) {
        log(
            `DRY_RUN complete — no tracker data was fetched and no data CSV was written. Review ${manifestPath} for ` +
                `the full planned-unit list and row estimates.`
        );
        return;
    }

    const unitsToRun = plannedUnits.filter(unit => {
        if (unit.plannedStatus === "SKIPPED") return WRITE_EMPTY_FILES; // handled separately below
        if (!RESUME_FROM || OVERWRITE) return true;
        const priorOutcome = manifest.unitOutcomes[unitKey(unit.orgUnitId, unit.year)];
        const alreadySucceeded =
            priorOutcome?.finalStatus === "SUCCEEDED" &&
            priorOutcome.outputFile &&
            existsSync(path.join(outputDir, priorOutcome.outputFile));
        if (alreadySucceeded) log(`Resume: skipping already-succeeded unit ${unit.orgUnitCode}/${unit.year}.`);
        return !alreadySucceeded;
    });

    const heartbeat = setInterval(() => void reauthenticate("heartbeat"), AUTH_HEARTBEAT_INTERVAL);
    const anomalies = createAnomalies();
    const rowsByCountry: Record<string, number> = {};
    const rowsByYear: Record<string, number> = {};
    let succeeded = 0;
    let failed = 0;
    let warning = 0;
    const hydratedTeiIdsByCountry = new Map<string, Set<string>>();

    // Header-only files for coverage-skipped units, when explicitly requested (no tracker fetch).
    if (WRITE_EMPTY_FILES) {
        for (const unit of plannedUnits.filter(u => u.plannedStatus === "SKIPPED")) {
            const outputKey = outputKeyFor(unit);
            const dataFile = dataFileName(ctx.moduleLabel, envLabel, runTimestamp, outputKey);
            const writer = new CsvStreamWriter(path.join(outputDir, dataFile), ctx.customDataColumns, {
                bom: WRITE_BOM,
            });
            await writer.finalize();
            const outcome: UnitOutcomeRecord = {
                orgUnitId: unit.orgUnitId,
                orgUnitCode: unit.orgUnitCode,
                year: unit.year,
                finalStatus: "SKIPPED",
                rowsWritten: 0,
                pagesFetched: 0,
                outputFile: dataFile,
                reason: `${unit.skipReason} (WRITE_EMPTY_FILES=true: header-only file written)`,
                planSource: unit.planSource,
                startTs: new Date().toISOString(),
                endTs: new Date().toISOString(),
            };
            manifest.unitOutcomes[unitKey(unit.orgUnitId, unit.year)] = outcome;
            appendProgressRow(progressFilePath, ctx, unit, outcome);
        }
    } else {
        for (const unit of plannedUnits.filter(u => u.plannedStatus === "SKIPPED")) {
            const outcome: UnitOutcomeRecord = {
                orgUnitId: unit.orgUnitId,
                orgUnitCode: unit.orgUnitCode,
                year: unit.year,
                finalStatus: "SKIPPED",
                rowsWritten: 0,
                pagesFetched: 0,
                reason: unit.skipReason,
                planSource: unit.planSource,
                startTs: new Date().toISOString(),
                endTs: new Date().toISOString(),
            };
            manifest.unitOutcomes[unitKey(unit.orgUnitId, unit.year)] = outcome;
            appendProgressRow(progressFilePath, ctx, unit, outcome);
        }
    }

    const runnableUnits = unitsToRun.filter(u => u.plannedStatus === "PLANNED");

    async function runOneUnitToOwnFile(unit: PlannedUnit): Promise<void> {
        const startTs = new Date().toISOString();
        const outputKey = outputKeyFor(unit);
        const dataFile = dataFileName(ctx.moduleLabel, envLabel, runTimestamp, outputKey);
        const dataPath = path.join(outputDir, dataFile);
        const auditPath = path.join(outputDir, auditFileName(dataFile));
        await CsvStreamWriter.discardPartial(dataPath);
        await CsvStreamWriter.discardPartial(auditPath);
        const mainWriter = new CsvStreamWriter(dataPath, ctx.customDataColumns, { bom: WRITE_BOM });
        const auditWriter = new CsvStreamWriter(auditPath, AUDIT_HEADERS);
        const cache = new BoundedCache<string, Map<string, string>>(HYDRATION_CACHE_SIZE);

        let outcome: UnitOutcomeRecord;
        try {
            const result = await runUnit(unit, ctx, cache, mainWriter, auditWriter, anomalies);
            await mainWriter.finalize();
            await auditWriter.finalize();

            if (FULL_SCAN) {
                const existing = hydratedTeiIdsByCountry.get(unit.orgUnitId) ?? new Set<string>();
                for (const id of result.hydratedTeiIds) existing.add(id);
                hydratedTeiIdsByCountry.set(unit.orgUnitId, existing);
            }

            rowsByCountry[unit.orgUnitCode] = (rowsByCountry[unit.orgUnitCode] ?? 0) + result.rowsWritten;
            rowsByYear[unit.year] = (rowsByYear[unit.year] ?? 0) + result.rowsWritten;

            if (unit.hasCoverageEvidence && result.rowsWritten === 0) {
                warning++;
                anomalies.coverageExportMismatches.push(unitKey(unit.orgUnitId, unit.year));
                outcome = {
                    orgUnitId: unit.orgUnitId,
                    orgUnitCode: unit.orgUnitCode,
                    year: unit.year,
                    finalStatus: "WARNING",
                    rowsWritten: 0,
                    pagesFetched: result.pagesFetched,
                    outputFile: dataFile,
                    reason: "COVERAGE_EXPORT_MISMATCH: coverage indicated data exists but the export returned zero rows",
                    planSource: unit.planSource,
                    startTs,
                    endTs: new Date().toISOString(),
                };
            } else {
                succeeded++;
                if (!unit.hasCoverageEvidence && result.rowsWritten > 0) {
                    anomalies.foundDataNotInCoverage.push(unitKey(unit.orgUnitId, unit.year));
                }
                outcome = {
                    orgUnitId: unit.orgUnitId,
                    orgUnitCode: unit.orgUnitCode,
                    year: unit.year,
                    finalStatus: "SUCCEEDED",
                    rowsWritten: result.rowsWritten,
                    pagesFetched: result.pagesFetched,
                    bytesWritten: mainWriter.bytesWritten,
                    outputFile: dataFile,
                    planSource: unit.planSource,
                    startTs,
                    endTs: new Date().toISOString(),
                };
            }
        } catch (error) {
            failed++;
            const message = error instanceof Error ? error.message : String(error);
            log(`FAILED ${unit.orgUnitCode}/${unit.year}: ${message}`, LogLevel.ERROR);
            const rowsSoFar = mainWriter.rowsWritten;
            await mainWriter.abort();
            await auditWriter.abort();
            outcome = {
                orgUnitId: unit.orgUnitId,
                orgUnitCode: unit.orgUnitCode,
                year: unit.year,
                finalStatus: rowsSoFar > 0 ? "PARTIAL" : "FAILED",
                rowsWritten: rowsSoFar,
                pagesFetched: 0,
                outputFile: undefined, // deliberately absent: `${dataFile}.partial` is the only artifact, never mistaken for success
                reason: message,
                planSource: unit.planSource,
                startTs,
                endTs: new Date().toISOString(),
            };
        }

        manifest.unitOutcomes[unitKey(unit.orgUnitId, unit.year)] = outcome;
        appendProgressRow(progressFilePath, ctx, unit, outcome);
        writeManifest(manifestPath, manifest);
        if (fatalAuthErrorMessage) throw new Error(fatalAuthErrorMessage);
    }

    if (OUTPUT_GRANULARITY === "COUNTRY_YEAR") {
        await promiseMapConcurrent(runnableUnits, unit => runOneUnitToOwnFile(unit), FETCH_CONCURRENCY).catch(error => {
            log(`Export aborted: ${error instanceof Error ? error.message : String(error)}`, LogLevel.ERROR);
        });
    } else {
        // Shared-file modes: force strictly sequential processing (concurrency=1) so a shared stream is
        // never written by concurrent workers — correctness over parallel speed (see design plan Point 9).
        const groups = _.groupBy(runnableUnits, outputKeyFor);
        for (const [outputKey, unitsInGroup] of Object.entries(groups)) {
            const dataFile = dataFileName(ctx.moduleLabel, envLabel, runTimestamp, outputKey);
            const dataPath = path.join(outputDir, dataFile);
            const auditPath = path.join(outputDir, auditFileName(dataFile));
            await CsvStreamWriter.discardPartial(dataPath);
            await CsvStreamWriter.discardPartial(auditPath);
            const mainWriter = new CsvStreamWriter(dataPath, ctx.customDataColumns, { bom: WRITE_BOM });
            const auditWriter = new CsvStreamWriter(auditPath, AUDIT_HEADERS);
            const cache = new BoundedCache<string, Map<string, string>>(HYDRATION_CACHE_SIZE);
            let groupFailed = false;

            for (const unit of unitsInGroup) {
                const startTs = new Date().toISOString();
                try {
                    const result = await runUnit(unit, ctx, cache, mainWriter, auditWriter, anomalies);
                    rowsByCountry[unit.orgUnitCode] = (rowsByCountry[unit.orgUnitCode] ?? 0) + result.rowsWritten;
                    rowsByYear[unit.year] = (rowsByYear[unit.year] ?? 0) + result.rowsWritten;

                    const mismatch = unit.hasCoverageEvidence && result.rowsWritten === 0;
                    if (mismatch) {
                        warning++;
                        anomalies.coverageExportMismatches.push(unitKey(unit.orgUnitId, unit.year));
                    } else {
                        succeeded++;
                        if (!unit.hasCoverageEvidence && result.rowsWritten > 0) {
                            anomalies.foundDataNotInCoverage.push(unitKey(unit.orgUnitId, unit.year));
                        }
                    }
                    const outcome: UnitOutcomeRecord = {
                        orgUnitId: unit.orgUnitId,
                        orgUnitCode: unit.orgUnitCode,
                        year: unit.year,
                        finalStatus: mismatch ? "WARNING" : "SUCCEEDED",
                        rowsWritten: result.rowsWritten,
                        pagesFetched: result.pagesFetched,
                        outputFile: dataFile,
                        reason: mismatch
                            ? "COVERAGE_EXPORT_MISMATCH: coverage indicated data exists but the export returned zero rows"
                            : undefined,
                        planSource: unit.planSource,
                        startTs,
                        endTs: new Date().toISOString(),
                    };
                    manifest.unitOutcomes[unitKey(unit.orgUnitId, unit.year)] = outcome;
                    appendProgressRow(progressFilePath, ctx, unit, outcome);
                } catch (error) {
                    failed++;
                    groupFailed = true;
                    const message = error instanceof Error ? error.message : String(error);
                    log(
                        `FAILED ${unit.orgUnitCode}/${unit.year} (shared file ${dataFile}): ${message}`,
                        LogLevel.ERROR
                    );
                    const outcome: UnitOutcomeRecord = {
                        orgUnitId: unit.orgUnitId,
                        orgUnitCode: unit.orgUnitCode,
                        year: unit.year,
                        finalStatus: "FAILED",
                        rowsWritten: 0,
                        pagesFetched: 0,
                        reason: message,
                        planSource: unit.planSource,
                        startTs,
                        endTs: new Date().toISOString(),
                    };
                    manifest.unitOutcomes[unitKey(unit.orgUnitId, unit.year)] = outcome;
                    appendProgressRow(progressFilePath, ctx, unit, outcome);
                }
                writeManifest(manifestPath, manifest);
            }

            // A shared file can only be finalized (renamed into place) if every contributing unit
            // succeeded — a shared file mixing units is never presented as complete if any one of its
            // contributing units failed.
            if (groupFailed) {
                await mainWriter.abort();
                await auditWriter.abort();
                log(
                    `Shared file ${dataFile} left as .partial — at least one contributing unit failed.`,
                    LogLevel.ERROR
                );
            } else {
                await mainWriter.finalize();
                await auditWriter.finalize();
            }
        }
    }

    clearInterval(heartbeat);

    if (FULL_SCAN) {
        let zeroEventTeis = 0;
        for (const [orgUnitId, hydrated] of hydratedTeiIdsByCountry.entries()) {
            const allIds = await scanAllTeiIdsForCountry(ctx.programId, orgUnitId);
            for (const id of allIds) if (!hydrated.has(id)) zeroEventTeis++;
        }
        anomalies.zeroStageEventTeis = zeroEventTeis;
    }

    const summary = {
        plannedUnits: plannedUnits.length,
        skippedUnits: skippedCount,
        succeededUnits: succeeded,
        failedUnits: failed,
        warningUnits: warning,
        coverageExportMismatches: anomalies.coverageExportMismatches,
        foundDataNotInCoverage: anomalies.foundDataNotInCoverage,
        teisWithMultipleSelectedStageEvents: anomalies.multiEventTeis,
        teisWithZeroSelectedStageEvents: anomalies.zeroStageEventTeis ?? "not_computed (requires FULL_SCAN)",
        duplicateEventIds: anomalies.duplicateEventIds,
        missingAttributesForEvent: anomalies.missingAttributesForEvent,
        unresolvedOrgUnitAttributeValues: anomalies.unresolvedOrgUnitAttributeValues,
        missingTrackedEntity: anomalies.missingTrackedEntity,
        missingEventId: anomalies.missingEventId,
        missingKeyFieldCounts: anomalies.missingKeyFieldCounts,
        rowsByCountry,
        rowsByYear,
        rowsByStage: { [ctx.programStageName]: Object.values(rowsByCountry).reduce((a, b) => a + b, 0) },
    };
    manifest.summary = summary;
    writeManifest(manifestPath, manifest);

    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    console.info(`Export completed in ${elapsedSeconds} seconds`);
    console.info(`Summary: ${JSON.stringify(summary, null, 2)}`);
    console.info(`Output folder: ${outputDir}`);
    console.info(`Progress report: ${progressFilePath}`);
    console.info(`Manifest: ${manifestPath}`);
}

main().catch(err => {
    console.error("Fatal error occurred:", err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.stack) console.error(err.stack);
    process.exit(1);
});

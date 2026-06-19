import { D2Api, Id } from "@eyeseetea/d2-api/2.34";
import dotenv from "dotenv";
import { promises as fs } from "node:fs";
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
import { getInstance, warmUpSession } from "./common";
import { DataValuesDefaultImportRepository } from "../data/repositories/data-entry/DataValuesDefaultImportRepository";
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

dotenv.config();
console.log("Auth:", process.env.REACT_APP_DHIS2_AUTH);
console.log("REACT_APP_DHIS2_BASE_URL:", process.env.REACT_APP_DHIS2_BASE_URL);

/*
(async () => {
    const g = globalThis as any;

    // If Blob/File are missing in this Node 18 runtime, *define them* (don't overwrite if present)
    if (typeof g.Blob !== 'function' || typeof g.File !== 'function' || typeof g.FormData !== 'function') {
        const { Blob: PBlob, File: PFile, FormData: PFormData } = await import('formdata-node');
        if (typeof g.Blob !== 'function') g.Blob = PBlob;
        if (typeof g.File !== 'function') g.File = PFile;
        if (typeof g.FormData !== 'function') g.FormData = PFormData;
        console.log('[bootstrap] Using formdata-node for missing globals:', {
            Blob: typeof g.Blob, File: typeof g.File, FormData: typeof g.FormData
        });
    } else {
        console.log('[bootstrap] Native globals present:', {
            Blob: typeof g.Blob, File: typeof g.File, FormData: typeof g.FormData
        });
    }
})();


import XlsxPopulateDefault from '@eyeseetea/xlsx-populate';
import * as XlsxPopulateNS from '@eyeseetea/xlsx-populate';
import { Future, FutureData } from "../domain/entities/Future";
import { DownloadDocumentAsArrayBufferUseCase } from "../domain/usecases/DownloadDocumentAsArrayBufferUseCase";

function patchXpp(mod: any, tag: string) {
    if (!mod || (mod as any).__bytesFirstPatched) return;

    const orig = mod.fromDataAsync?.bind(mod);
    if (typeof orig !== 'function') {
        console.warn(`[xpp-patch] ${tag}: fromDataAsync not found; patch skipped.`);
        return;
    }

    (mod as any).fromDataAsync = async (input: any, ...args: any[]) => {
        try {
            const meta = {
                ctor: input?.constructor?.name,
                name: input?.name,
                type: input?.type,
                size: input?.size,
                hasArrayBuffer: typeof input?.arrayBuffer === 'function',
            };
            console.log(`[xpp-patch] ${tag} input meta:`, meta);

            let bytes: Uint8Array | null = null;

            if (meta.hasArrayBuffer) {
                const ab: ArrayBuffer = await input.arrayBuffer();
                bytes = new Uint8Array(ab);
            } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
                bytes = new Uint8Array(input);
            } else if (input instanceof Uint8Array) {
                bytes = input;
            } else if (input instanceof ArrayBuffer) {
                bytes = new Uint8Array(input);
            } else if (ArrayBuffer.isView(input)) {
                const v = input as ArrayBufferView;
                bytes = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
            }

            if (bytes) {
                const magic = Array.from(bytes.subarray(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' ');
                const head16 = Array.from(bytes.subarray(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
                console.log(`[xpp-patch] ${tag} normalized bytes length:`, bytes.byteLength);
                console.log(`[xpp-patch] ${tag} first 16 bytes (hex):`, head16);
                console.log(`[xpp-patch] ${tag} expect ZIP magic "50 4b 03 04", got:`, magic);
                return await orig(bytes, ...args);
            }

            console.log(`[xpp-patch] ${tag} input not recognized as Blob/bytes; calling original.`);
            return await orig(input, ...args);
        } catch (e) {
            console.error(`[xpp-patch] ${tag} normalization failed; calling original. Error:`, e);
            return await orig(input, ...args);
        }
    };

    (mod as any).__bytesFirstPatched = true;
    console.log(`[xpp-patch] Patched ${tag} (bytes-first).`);
}

// Patch both default and namespace exports (covers both import styles)
patchXpp(XlsxPopulateDefault as any, 'default');
patchXpp(XlsxPopulateNS as any, 'namespace');
// --- END: bytes-first monkey patch ---
*/

//let instance: Instance;
let dataStoreClient: DataStoreClient;
let metadataRepository: MetadataDefaultRepository;
let amcProductDataRepository: AMCProductDataDefaultRepository;
let glassDocumentsRepository: GlassDocumentsDefaultRepository;
let glassUploadsRepository: GlassUploadsProgramRepository;
let amcSubstanceDataRepository: AMCSubstanceDataDefaultRepository;
//let uploadDocumentsUseCase: UploadDocumentUseCase;
let setUploadStatusUseCase: SetUploadStatusUseCase;
//let updateSecondaryFileWithPrimaryId: UpdateSampleUploadWithRisIdUseCase;
let dataValuesRepository: DataValuesDefaultImportRepository;
//let importRISFile: ImportRISFile;
//let importSampleFile: ImportSampleFile;
let getSpecificDataSubmission: GetSpecificDataSubmissionUseCase;
let saveDataSubmissions: SaveDataSubmissionsUseCase;
let setSubmissionStatus: SetDataSubmissionStatusUseCase;
let glassDataSubmissionRepository: GlassDataSubmissionsDefaultRepository;
let moduleRepository: GlassModuleRepository;
//let risDataSetImportHelper: RISDataSetImportHelper;
//let sampleDataSetImportHelper: SampleDatasetImportHelper;
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
let waitingRetriesCount = 0;
let authPromise: Promise<void> | null = null;

let orgUnits: { [key: string]: string } = {};
let allDataSubmissions = new Map<string, GlassDataSubmission>();
let allUploads = new Map<string, GlassUploads[]>();
let api!: D2Api;
const errorMessages: string[] = [];

interface FileMetaData {
    fileUploadId: string;
    fileId: string;
    fileType: string;
    file: File;
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
    batchId: string;
    dataSubmission: GlassDataSubmission;
    existingUploads: GlassUploads[];
}

function getEnvVars() {
    if (!process.env.REACT_APP_DHIS2_BASE_URL)
        throw new Error("REACT_APP_DHIS2_BASE_URL  must be set in the .env file");

    console.log("REACT_APP_DHIS2_BASE_URL:", process.env.REACT_APP_DHIS2_BASE_URL);

    if (!process.env.REACT_APP_DHIS2_AUTH) throw new Error("REACT_APP_DHIS2_BASE_URL  must be set in the .env file");

    const username = process.env.REACT_APP_DHIS2_AUTH.split(":")[0] ?? "";
    const password = process.env.REACT_APP_DHIS2_AUTH.split(":")[1] ?? "";

    if (username === "" || password === "") {
        throw new Error("REACT_APP_DHIS2_AUTH must be in the format 'username:password'");
    }
    const envVars = {
        url: process.env.REACT_APP_DHIS2_BASE_URL,
        auth: {
            username: username,
            password: password,
        },
    };

    return envVars;
}

async function initializeGlobals() {
    const startTime = Date.now();
    const envVars = getEnvVars();
    const instance = getInstance(envVars);
    api = getD2APiFromInstance(instance);
    await warmUpSession(api);
    const runtime: "node" | "browser" = typeof window === "undefined" ? "node" : "browser";
    const uploadsFormDataBuilder = getUploadsFormDataBuilder(runtime);

    //DataStore
    dataStoreClient = new DataStoreClient(undefined, api);
    glassDocumentsRepository = new GlassDocumentsDefaultRepository(dataStoreClient, instance);
    glassUploadsRepository = new GlassUploadsProgramRepository(api, uploadsFormDataBuilder);
    moduleRepository = new GlassModuleDefaultRepository(dataStoreClient);
    glassDataSubmissionRepository = new GlassDataSubmissionsDefaultRepository(dataStoreClient);
    //uploadDocumentsUseCase = new UploadDocumentUseCase(glassDocumentsRepository, glassUploadsRepository);
    setUploadStatusUseCase = new SetUploadStatusUseCase(glassUploadsRepository);
    //updateSecondaryFileWithPrimaryId = new UpdateSampleUploadWithRisIdUseCase(glassUploadsRepository);
    getSpecificDataSubmission = new GetSpecificDataSubmissionUseCase(glassDataSubmissionRepository);
    setSubmissionStatus = new SetDataSubmissionStatusUseCase(glassDataSubmissionRepository);
    saveDataSubmissions = new SaveDataSubmissionsUseCase(glassDataSubmissionRepository);

    //DHIS2 backend (Do these have a shared authentication session?)
    metadataRepository = new MetadataDefaultRepository(undefined, api);
    dataValuesRepository = new DataValuesDefaultImportRepository(api);

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

    [allDataSubmissions, allUploads] = await Promise.all([
        initializDataSubmissions(),
        getAllUpLoads(),
        initializeOrgUnits(),
    ]);

    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    log(`Initialization done in ${elapsedSeconds} seconds`);
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
        errorMessages.push(message);
    } else {
        console.error("Attempted to add an empty message.");
    }
}

async function writeErrorFile() {
    const errorFileName = "ErrorsImportingFiles.txt";
    //fs.writeFile(errorFileName, errorMessages.join("\n"), err => { });
    try {
        console.log("Error messages size:", errorMessages.length);
        await fs.writeFile(errorFileName, errorMessages.join("\n"));
        console.log("Error messages written to file successfully.");
    } catch (writeError) {
        if (writeError instanceof Error) {
            console.error(`Failed to write error file: ${writeError.message}`);
        } else {
            console.error("An unknown error occurred.");
        }
    }
}

/*
================================================================
HELPER FUNCTIONS AND UTILS (PERHAPS COULD GO INTO ANOTHER FILE)
================================================================
*/

let lastAuthTime: number | null = null;
const AUTH_COOLDOWN_PERIOD = 60000;

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
            console.error(`Error in attempt ${attempt} of ${maxRetries}:`, error);

            if (String(error).includes("Import Ignored")) {
                console.warn("The server returned Import Ignored. No reason to retry.");
                log(error, LogLevel.ERROR);
                break;
            }

            const now = Date.now();
            const shouldReauthenticate =
                attempt === Math.floor(maxRetries / 2) || String(error).includes("Bad Gateway");
            const isAuthCooldownActive = lastAuthTime && now - lastAuthTime < AUTH_COOLDOWN_PERIOD;

            if (shouldReauthenticate && !isAuthCooldownActive) {
                if (!authPromise) {
                    console.error("Attempting reauthentication...");
                    authPromise = warmUpSession(api); // Re-initialize the DHIS2 session
                    try {
                        await authPromise;
                        lastAuthTime = Date.now(); // Update the last authentication timestamp
                        console.log("Reauthentication successful.");
                    } catch (authError) {
                        console.error("Error during reauthentication:", authError);
                    } finally {
                        authPromise = null; // Clear the promise once done
                    }
                } else {
                    console.log("Waiting for ongoing reauthentication...");
                    await authPromise; // Wait for the ongoing authentication to finish
                }
            } else if (isAuthCooldownActive) {
                console.log("Skipping reauthentication due to active cooldown period.");
            }

            if (attempt === maxRetries) {
                throw new Error(
                    `Failed after ${maxRetries} retries: ${error instanceof Error ? error.message : String(error)}`
                );
            }

            waitingRetriesCount++;
            console.log("Current waiting retries count: ", waitingRetriesCount);

            const backoffDelay = Math.min(delay * Math.pow(2, attempt - 1), maxDelay);
            console.log(`Retrying in ${backoffDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));

            waitingRetriesCount--;
            console.log("Waiting retries count after wait: ", waitingRetriesCount);

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
}

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
            dataSubmissionObjects.forEach(submission => {
                const key = `${submission.orgUnit}_${submission.period}`;
                allDataSubmissions.set(key, submission);
            });
        } else {
            log(`No data submissions found for the given filters`, LogLevel.ERROR);
        }
    } catch (error) {
        log(`Error fetching GlassDataSubmission objects: ${error}`, LogLevel.ERROR);
    }
    return allDataSubmissions;
}

function getDataSubmission(orgUnitId: string, period: string) {
    const key = `${orgUnitId}_${period}`;
    return allDataSubmissions.get(key);
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

//Update Jan 2026, this might have changed to no longer be in the dataStore but in a dedicated Tracker Program
async function getAllUpLoads(): Promise<Map<string, GlassUploads[]>> {
    try {
        const allUploads: GlassUploads[] =
            (await dataStoreClient
                .getObjectsFilteredByProps<GlassUploads>(
                    DataStoreKeys.UPLOADS,
                    new Map<keyof GlassUploads, unknown>([])
                )
                .toPromise()) || [];

        const uploadsMap = new Map<string, GlassUploads[]>();

        if (!Array.isArray(allUploads)) {
            throw new Error("allUploads is not an array");
        }

        allUploads.forEach(upload => {
            const dataSubmissionId = upload.dataSubmission;

            if (!uploadsMap.has(dataSubmissionId)) {
                uploadsMap.set(dataSubmissionId, []);
            }

            uploadsMap.get(dataSubmissionId)?.push(upload);
        });

        return uploadsMap;
    } catch (error) {
        log(`Error fetching or initializing uploads: ${error}`);
        throw error;
    }
}

function checkForExistingValidDataFiles(fileMetaData: FileMetaData): boolean {
    const dataSubmissionId = fileMetaData.batchMetaData.dataSubmission.id;
    const fileType = fileMetaData.fileType;
    const existingUploads = fileMetaData.batchMetaData.existingUploads;

    try {
        if (!Array.isArray(existingUploads)) {
            log(`existingUploads is not an array for submission ${dataSubmissionId}`, LogLevel.ERROR);
            return false;
        }

        const fileExists = existingUploads.some(upload => {
            return (
                upload.fileType?.toLowerCase().includes(fileType.toLowerCase()) &&
                upload.period === fileMetaData.batchMetaData.dataSubmission.period &&
                upload.orgUnit === fileMetaData.batchMetaData.dataSubmission.orgUnit &&
                (upload.status === "COMPLETED" || upload.status === "VALIDATED")
            );
        });
        return fileExists;
    } catch (error) {
        const errorMessage = `Error checking existing uploads for Submission ${dataSubmissionId}, 
             orgUnit=${fileMetaData.batchMetaData.orgUnitCode}, 
             period=${fileMetaData.batchMetaData.dataSubmission.period}, 
             type=${fileType}.
             Error: ${String(error)}`;

        log(errorMessage, LogLevel.ERROR);
        throw new Error(errorMessage);
    }
}

function isValidFileDataType(data: any): data is FileData {
    return (
        typeof data.isValid === "boolean" &&
        data.isValid &&
        //&& Array.isArray(data.countries)
        //&& Array.isArray(data.periods)
        //&& Array.isArray(data.batchIds)
        Number.isInteger(data.rows) &&
        Array.isArray(data.specimens)
    );
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
    console.log(`[createBufferFileFromPath] Detected MIME type for ${fileName}: ${type}`);

    const [buf, stat] = await Promise.all([
        fs.readFile(filePath),
        fs.stat(filePath).catch(() => null), // tolerate missing stat
    ]);

    const lastModified = stat?.mtimeMs ?? Date.now();
    console.log(
        `[createBufferFileFromPath] Read file ${fileName}, size: ${buf.length} bytes, lastModified: ${lastModified}`
    );

    const arrayBuffer = toArrayBufferCopy(buf);

    const result: BufferFile = {
        name: fileName,
        type,
        size: buf.length,
        lastModified,
        buffer: buf,
        arrayBuffer,
    };

    console.log("[createBufferFileFromPath] Created BufferFile meta:", {
        name: result.name,
        type: result.type,
        size: result.size,
        lastModified: result.lastModified,
    });

    return result;
}

/*async function createFileFromPath(filePath: string): Promise<File> {
    console.log(`[createFileFromPath] Creating File from path: ${filePath}`);
    const fileName = path.basename(filePath);
    const fileBuffer = await fs.readFile(filePath);
    //const blobFile = new Blob([fileBuffer], { type: "application/octet-stream" });
    const blobFile = new Blob([new Uint8Array(fileBuffer)], { type: "application/octet-stream" });
    return new File([blobFile], fileName, {
        type: blobFile.type,
        lastModified: Date.now(),
    });
}*/

// Detect correct MIME for logs and downstream metadata
function detectMimeFromExt(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    switch (ext) {
        case ".xlsx":
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        case ".xls":
            return "application/vnd.ms-excel";
        case ".csv":
            return "text/csv; charset=utf-8";
        default:
            return "application/octet-stream";
    }
}

export async function createFileFromPath(filePath: string): Promise<File> {
    const fileName = path.basename(filePath);
    const type = detectMimeFromExt(fileName);
    console.log(`[createFileFromPath] Detected MIME type for ${fileName}: ${type}`);

    const buf: Buffer = await fs.readFile(filePath);
    console.log(`[createFileFromPath] Read file ${fileName}, size: ${buf.length} bytes`);

    // Prefer native Blob if present; fallback to formdata-node's Blob if missing
    let BlobCtor: typeof Blob;
    if (typeof (globalThis as any).Blob === "function") {
        BlobCtor = (globalThis as any).Blob as typeof Blob;
        console.log("[createFileFromPath] Using native Blob");
    } else {
        const { Blob: PBlob } = await import("formdata-node");
        BlobCtor = PBlob as unknown as typeof Blob;
        console.log("[createFileFromPath] Using polyfilled Blob from formdata-node");
    }

    const bytes = new Uint8Array(buf);
    const blob = new BlobCtor([bytes], { type });
    console.log(`[createFileFromPath] Created Blob for ${fileName}, size: ${blob.size} bytes, type: ${type}`);

    // Figure out a usable File constructor *without* modifying globals
    let FileCtor: any = (globalThis as any).File;
    if (typeof FileCtor !== "function") {
        const { File: PFile } = await import("formdata-node");
        FileCtor = PFile;
        console.log("[createFileFromPath] Using polyfilled File from formdata-node");
    } else {
        console.log("[createFileFromPath] Using native File");
    }

    const file = new FileCtor([blob], fileName, { type, lastModified: Date.now() });

    // Final meta log
    console.log("[createFileFromPath] Created File meta:", {
        ctor: file?.constructor?.name,
        name: (file as any)?.name,
        type: (file as any)?.type,
        size: (file as any)?.size,
    });

    return file as File;
}

async function validateFile(fileArrayBuffer: ArrayBuffer, dataRepository: any): Promise<FileData> {
    try {
        const module = await moduleRepository.getByName(moduleName).toPromise();

        if (!module) {
            throw new Error(`Module '${moduleName}' does not exist`);
        }

        return await dataRepository.validateFileBuffer(fileArrayBuffer, module.dataColumns, module.teiColumns);
    } catch (error) {
        const msg = `Validation error for file ${fileArrayBuffer}: ${
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
        //fileMetaData.fileId = await retryWithBackoff(() =>
        console.log("Uploading file to DataStore: ", fileMetaData.fileName);
        glassDocumentsRepository
            .saveBuffer(fileMetaData.fileBuffer.buffer, fileMetaData.fileName, moduleName)
            .toPromise();
        //);
        console.info(
            ` ${fileMetaData.fileType} File ${fileMetaData.fileName} uploaded successfully with File ID: ${fileMetaData.fileId}`
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
        fileType: fileMetaData.fileType,
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
        console.log("Saving upload data to uploadData: ", uploadData);
        await retryWithBackoff(() => glassUploadsRepository.save(uploadData).toPromise());
        console.info(
            `Successfully saved to dataStore the upload data for ${fileMetaData.fileType} file: ${fileMetaData.fileName} with upload ID: ${uploadData.id}`
        );
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
    console.info(`Importing data values for ${fileMetaData.fileType} file: ${fileMetaData.fileName}`);
    const startTime = Date.now();
    const allCountries = await countryRepository.getAll().toPromise();
    try {
        console.log("Validating file data for file: ", fileMetaData.fileName);
        fileMetaData.fileData = await validateFile(
            fileMetaData.fileBuffer.arrayBuffer,
            fileMetaData.fileType === "product" ? amcProductDataRepository : amcSubstanceDataRepository
        );

        if (fileMetaData.fileType === "product") {
            console.log("Importing product level data");

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
            console.log(
                "bulkUploadAMUFiles uploadDataValues Starting import of AMC Product File:",
                fileMetaData.fileName
            );

            importSummary = await importAMCProductFile
                .importAMCProductFileAsBuffer(
                    fileMetaData.fileBuffer.arrayBuffer,
                    CREATE_AND_UPDATE,
                    "",
                    fileMetaData.batchMetaData.dataSubmission.orgUnit,
                    fileMetaData.batchMetaData.orgUnitCode,
                    moduleName,
                    fileMetaData.batchMetaData.dataSubmission.period,
                    fileMetaData.fileUploadId,
                    allCountries
                )
                .toPromise();
        } else {
            console.log("Importing substance level data");
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
                .import(
                    fileMetaData.file,
                    CREATE_AND_UPDATE,
                    "",
                    moduleName,
                    fileMetaData.batchMetaData.dataSubmission.orgUnit,
                    fileMetaData.batchMetaData.orgUnitCode,
                    fileMetaData.batchMetaData.dataSubmission.period
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
            //await setUploadStatusUseCase.execute({ id: fileMetaData.fileUploadId, status: "IMPORTED" }).toPromise();
            throw new Error(errorMessage);
        } else {
            //await setUploadStatusUseCase.execute({ id: fileMetaData.fileUploadId, status: "VALIDATED" }).toPromise();
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            console.info(
                `Metadata within File ${fileMetaData.fileName} successfully imported with status ${importSummary.status} in ${elapsedSeconds} seconds`
            );
            return importSummary.status;
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
    try {
        await datastore_semaphore.acquire();
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

async function uploadDataValuesAndFile(fileMetaData: FileMetaData): Promise<void> {
    let metaDataImportSummaryStatus;
    await batch_semaphore.acquire();
    const startTime = Date.now();
    try {
        const fileExists = checkForExistingValidDataFiles(fileMetaData);
        if (fileExists) {
            const errorMessage = ` Data submission already contains a file like ${fileMetaData.fileName} for ${fileMetaData.fileType} & ${fileMetaData.batchMetaData.orgUnitCode} & ${fileMetaData.batchMetaData.dataSubmission.period}: dataSubmission: ${fileMetaData.batchMetaData.dataSubmission.id} `;
            log(errorMessage, LogLevel.WARN);
        } else {
            /*[primaryMetaDataImportSummaryStatus] = await Promise.all([
                retryWithBackoff(() => uploadDataValues(fileMetaData)),
                processFile(fileMetaData),
            ]);
            metaDataImportSummaryStatus = await retryWithBackoff(() =>
                uploadDataValues(fileMetaData)
            );*/
            metaDataImportSummaryStatus = await uploadDataValues(fileMetaData);
            console.log(
                `Metadata import summary status: ${metaDataImportSummaryStatus} for file: ${fileMetaData.fileName}`
            );
            await processFile(fileMetaData);

            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            console.warn(`All metadata and dataStore updates done for this batch in ${elapsedSeconds} seconds `);

            if (fileMetaData.fileName.includes("product")) {
                await consumptionDataProductLevel
                    .execute(
                        fileMetaData.batchMetaData.dataSubmission.period,
                        fileMetaData.batchMetaData.dataSubmission.orgUnit,
                        moduleName,
                        fileMetaData.fileId
                    )
                    .toPromise();
            } else if (fileMetaData.fileName.includes("substance")) {
                //As the semaphore for the dataStore has max thread limit of 1 this is basically synchronous anyway.
                //But if I want to run processBatchFiles Concurrently I might see minor benefits.
                //async
                /* [secondaryMetaDataImportSummaryStatus] = await Promise.all([
                     retryWithBackoff(() => uploadDataValues(fileMetaData)),
                     processFile(fileMetaData),
                 ]);*/

                await consumptionDataSubstanceLevel
                    .execute(
                        fileMetaData.fileId,
                        fileMetaData.batchMetaData.dataSubmission.period,
                        fileMetaData.batchMetaData.dataSubmission.orgUnit,
                        moduleName
                    )
                    .toPromise();

                //synchronous
                //const primaryMetaDataImportSummaryStatus = await uploadDataValues(primaryFileMetaData);

                /*secondaryMetaDataImportSummaryStatus = await retryWithBackoff(
                    () => uploadDataValues(secondaryFileMetaData),  
                    3,                         
                    1000,                       
                    10000,                      
                );*/
            } else {
                log(`Unrecognized file type: ${fileMetaData.fileName}`, LogLevel.ERROR);
            }

            //handlePostUploadBatchFileUpdates
            await datastore_semaphore.acquire();
            //console.log(`datastore_semaphore acquire for handlePostUploadBatchFileUpdates for ${primaryFileMetaData.file.name}: ${datastore_semaphore.getActiveCount()}`);
            try {
                await handlePostUploadBatchDatastoreUpdates(
                    fileMetaData.fileUploadId,
                    fileMetaData.batchMetaData.dataSubmission.id
                );
                console.warn(`Completed handlePostUploadBatchDatastoreUpdates for : ${fileMetaData.fileName}`);
            } catch (uploadError) {
                const errorMessage = `Error handlePostUploadBatchFileUpdates for ${fileMetaData.fileName}, ${
                    uploadError instanceof Error ? uploadError.message : String(uploadError)
                }`;
                log(errorMessage, LogLevel.ERROR);
            } finally {
                datastore_semaphore.release();
                //console.log(`datastore_semaphore release for handlePostUploadBatchFileUpdates for ${primaryFileMetaData.file.name}: ${datastore_semaphore.getActiveCount()}`);
            }
        }
    } catch (error) {
        const errorMessage = `Error processing file: ${fileMetaData.fileName}: ${
            error instanceof Error ? error.message : String(error)
        } `;
        log(errorMessage, LogLevel.ERROR);
    } finally {
        batch_semaphore.release();
    }
}

async function handlePostUploadBatchDatastoreUpdates(fileUploadId: string, submissionId: string) {
    try {
        //let promises: Promise<any>[];

        await retryWithBackoff(() =>
            setUploadStatusUseCase.execute({ id: fileUploadId, status: "COMPLETED" }).toPromise()
        );

        await retryWithBackoff(() => setSubmissionStatus.execute(submissionId, "PENDING_APPROVAL").toPromise());

        /*promises = [
                updateSecondaryFileWithPrimaryId.execute(secondaryFileUploadId, primaryFileUploadId).toPromise(),
                //setUploadStatusUseCase.execute({ id: primaryFileUploadId, status: "COMPLETED" }).toPromise(),
                //setUploadStatusUseCase.execute({ id: secondaryFileUploadId, status: "COMPLETED" }).toPromise(),
                setSubmissionStatus.execute(submissionId, "PENDING_APPROVAL").toPromise()
            ];*/

        //await Promise.all(promises);

        console.info(
            `Successfully processed file(s) for submission ${submissionId}, setting them to COMPLETED and PENDING_APPROVAL status.`
        );
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
        const filePath = path.join(directoryPath, file);

        try {
            if ((await fs.lstat(filePath)).isDirectory()) {
                console.log("It's a directory:", filePath);
                await processDirectory(filePath);
            } else {
                const fileName = path.basename(filePath);
                if (!fileName.includes(".")) {
                    throw new Error("The file name does not contain a dot.");
                }

                const beforeDot = fileName.split(".")[0];

                if (!beforeDot) {
                    throw new Error("Invalid file name format.");
                }

                if (beforeDot === "rename_products" || beforeDot === "rename_substance" || beforeDot === "recording") {
                    throw new Error("File not a data file.");
                }

                const batchId = ""; //no batchId in AMU files
                const period = beforeDot.substring(beforeDot.lastIndexOf("_") + 1);
                const [fileType, orgUnitCode] = fileName.split("_");

                if (!fileType) {
                    throw new Error(`Invalid filename: "${fileName}". Expected format: <fileType>_<orgUnitCode>...`);
                }

                if (!period) {
                    throw new Error("Missing period in file name.");
                }

                if (!orgUnitCode) {
                    throw new Error("Missing orgUnitCode in file name.");
                }

                const orgUnitId = orgUnits[orgUnitCode];
                if (!orgUnitId) {
                    throw new Error("Missing orgUnitId in file name.");
                }

                let dataSubmission = getDataSubmission(orgUnitId, period);

                //const existingUploads = await glassUploadsRepository.getUploadsByDataSubmission(dataSubmission.id).toPromise();
                if (!dataSubmission) {
                    log(
                        `No dataSubmission found for orgUnitId: ${orgUnitId} and orgUnitCode ${orgUnitCode} and period ${period} and module ${moduleName}`,
                        LogLevel.WARN
                    );
                    saveDataSubmissions.execute(moduleId, orgUnitId, [period]);
                    dataSubmission = await fetchDataSubmissionId(moduleId, moduleName, orgUnitId, period);
                    log(`Created a dataSubmission for orgUnitId: ${orgUnitId} and period ${period}`, LogLevel.WARN);
                }
                console.log(`Processing Data Submission ID: ${dataSubmission.id}`);

                let existingUploads = allUploads.get(dataSubmission.id);

                if (!existingUploads) {
                    existingUploads = [];
                }

                const batchMetaData: BatchMetaData = {
                    orgUnitCode: orgUnitCode,
                    batchId: batchId,
                    dataSubmission: dataSubmission,
                    existingUploads: existingUploads,
                };

                const fileMetaData: FileMetaData = {
                    fileUploadId: "",
                    fileId: "",
                    fileType: fileType!,
                    file: await createFileFromPath(filePath),
                    fileBuffer: await createBufferFileFromPath(filePath),
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
            const errorMessage = `Error processing Directory: ${path.basename(filePath)}: ${error} `;
            log(errorMessage, LogLevel.ERROR);
            throw new Error(errorMessage);
        }
        //})
        //);
    }
}

async function main() {
    const startTime = Date.now();

    await initializeGlobals();
    const rootDirectory = "C:\\Users\\odohertyd\\Downloads\\AMU_CSR_HistoricalData\\products\\test";

    try {
        await processDirectory(rootDirectory);
    } catch (error) {
        const errorMessage = `Error processing all files: ${error} `;
        log(errorMessage, LogLevel.ERROR);
        await writeErrorFile();
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        console.info(`Full upload process completed WITH ERROR in ${elapsedSeconds} seconds`);
    }
    await writeErrorFile();
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    console.info(`Full upload process completed in ${elapsedSeconds} seconds`);
}

main().catch(err => {
    console.error("Fatal error occurred:", err.message);
    process.exit(1);
});

import { D2Api } from "@eyeseetea/d2-api/2.34";
import dotenv from "dotenv";
import { promises as fs } from "fs";
import path from "path";

import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { DataStoreKeys } from "../data/data-store/DataStoreKeys";
import { DataValuesImportRepository } from "../data/repositories/data-entry/DataValuesImportRepository";
import { RISDataCSVDefaultRepository } from "../data/repositories/data-entry/RISDataCSVDefaultRepository";
import { SampleDataCSVDeafultRepository } from "../data/repositories/data-entry/SampleDataCSVDeafultRepository";
import { GlassDataSubmissionsDefaultRepository } from "../data/repositories/GlassDataSubmissionDefaultRepository";
import { GlassDocumentsDefaultRepository } from "../data/repositories/GlassDocumentsDefaultRepository";
import { GlassModuleDefaultRepository } from "../data/repositories/GlassModuleDefaultRepository";
import { GlassUploadsDefaultRepository } from "../data/repositories/GlassUploadsDefaultRepository";
import { MetadataDefaultRepository } from "../data/repositories/MetadataDefaultRepository";
import { GlassDataSubmission } from "../domain/entities/GlassDataSubmission";
import { GlassUploads } from "../domain/entities/GlassUploads";
import { GlassModuleRepository } from "../domain/repositories/GlassModuleRepository";
import { RISDataSetImportHelper } from "../domain/usecases/data-entry/amr/RISDataSetImportHelper";
import { SampleDatasetImportHelper } from "../domain/usecases/data-entry/amr/SampleDatasetImportHelper";
import { Semaphore } from "../domain/usecases/data-entry/utils/Semaphore";
import { GetSpecificDataSubmissionUseCase } from "../domain/usecases/GetSpecificDataSubmissionUseCase";
import { SaveDataSubmissionsUseCase } from "../domain/usecases/SaveDataSubmissionsUseCase";
import { SetDataSubmissionStatusUseCase } from "../domain/usecases/SetDataSubmissionStatusUseCase";
import { SetUploadStatusUseCase } from "../domain/usecases/SetUploadStatusUseCase";
import { UpdateSampleUploadWithRisIdUseCase } from "../domain/usecases/UpdateSampleUploadWithRisIdUseCase";
import { moduleProperties } from "../domain/utils/ModuleProperties";

import { generateUid } from "../utils/uid";
import { getD2ApiFromArgs } from "./common";

dotenv.config();
console.log("Base URL:", process.env.REACT_APP_DHIS2_BASE_URL);
console.log("Auth:", process.env.REACT_APP_DHIS2_AUTH);
console.log("REACT_APP_DHIS2_BASE_URL:", process.env.REACT_APP_DHIS2_BASE_URL);

//let instance: Instance;
let dataStoreClient: DataStoreClient;
let metadataRepository: MetadataDefaultRepository;
let risDataRepository: RISDataCSVDefaultRepository;
let glassDocumentsRepository: GlassDocumentsDefaultRepository;
let glassUploadsRepository: GlassUploadsDefaultRepository;
let sampleDataRepository: SampleDataCSVDeafultRepository;
//let uploadDocumentsUseCase: UploadDocumentUseCase;
let setUploadStatusUseCase: SetUploadStatusUseCase;
let updateSecondaryFileWithPrimaryId: UpdateSampleUploadWithRisIdUseCase;
let dataValuesRepository: DataValuesImportRepository;
//let importRISFile: ImportRISFile;
//let importSampleFile: ImportSampleFile;
let getSpecificDataSubmission: GetSpecificDataSubmissionUseCase;
let saveDataSubmissions: SaveDataSubmissionsUseCase;
let setSubmissionStatus: SetDataSubmissionStatusUseCase;
let glassDataSubmissionRepository: GlassDataSubmissionsDefaultRepository;
let moduleRepository: GlassModuleRepository;
let risDataSetImportHelper: RISDataSetImportHelper;
let sampleDataSetImportHelper: SampleDatasetImportHelper;

const moduleName = "AMR";
const moduleId = "AVnpk4xiXGG";
const CREATE_AND_UPDATE = "CREATE_AND_UPDATE";
const datastore_semaphore = new Semaphore(1);
const dataValues_semaphore = new Semaphore(2);
const batch_semaphore = new Semaphore(3);
let waitingRetriesCount = 0;
let authPromise: Promise<void> | null = null;

let orgUnits: { [key: string]: string } = {};
let allDataSubmissions = new Map<string, GlassDataSubmission>();
let allUploads = new Map<string, GlassUploads[]>();
let api = new D2Api();
const errorMessages: string[] = [];
interface FileMetaData {
    fileUploadId: string;
    fileId: string;
    fileType: string;
    file: File;
    fileData: FileData;
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

async function authenticate(): Promise<void> {
    console.warn("Authenticating!");
    return new Promise((resolve, reject) => {
        try {
            const envVars = getEnvVars();
            api = getD2ApiFromArgs(envVars);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

async function initializeGlobals() {
    const startTime = Date.now();
    await authenticate();
    //instance = getInstance(envVars);

    //DataStore
    dataStoreClient = new DataStoreClient(undefined, api);
    glassDocumentsRepository = new GlassDocumentsDefaultRepository(dataStoreClient, undefined, api);
    glassUploadsRepository = new GlassUploadsDefaultRepository(dataStoreClient);
    moduleRepository = new GlassModuleDefaultRepository(dataStoreClient);
    glassDataSubmissionRepository = new GlassDataSubmissionsDefaultRepository(dataStoreClient);
    // uploadDocumentsUseCase = new UploadDocumentUseCase(glassDocumentsRepository, glassUploadsRepository);
    setUploadStatusUseCase = new SetUploadStatusUseCase(glassUploadsRepository);
    updateSecondaryFileWithPrimaryId = new UpdateSampleUploadWithRisIdUseCase(glassUploadsRepository);
    getSpecificDataSubmission = new GetSpecificDataSubmissionUseCase(glassDataSubmissionRepository);
    setSubmissionStatus = new SetDataSubmissionStatusUseCase(glassDataSubmissionRepository);
    saveDataSubmissions = new SaveDataSubmissionsUseCase(glassDataSubmissionRepository);

    //DHIS2 backend (Do these have a shared authentication session?)
    metadataRepository = new MetadataDefaultRepository(undefined, api);
    dataValuesRepository = new DataValuesImportRepository(api);

    //Reads the files
    sampleDataRepository = new SampleDataCSVDeafultRepository();
    risDataRepository = new RISDataCSVDefaultRepository();

    //held in memory so need to check resources available to script

    [allDataSubmissions, allUploads] = await Promise.all([
        initializDataSubmissions(),
        getAllUpLoads(),
        initializeOrgUnits(),
    ]);

    /*importRISFile = new ImportRISFile(
        risDataRepository,
        metadataRepository,
        dataValuesRepository,
        moduleRepository
    );
    importSampleFile = new ImportSampleFile(
        sampleDataRepository,
        metadataRepository,
        dataValuesRepository
    );*/

    risDataSetImportHelper = await RISDataSetImportHelper.initialize(
        risDataRepository,
        metadataRepository,
        dataValuesRepository,
        moduleRepository
    );

    sampleDataSetImportHelper = await SampleDatasetImportHelper.initialize(
        sampleDataRepository,
        metadataRepository,
        dataValuesRepository,
        moduleRepository    
    );

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
    const batchId = fileMetaData.batchMetaData.batchId;
    try {
        // Check if a file with the specified batchId and fileType exists and is either COMPLETED or VALIDATED
        const fileExists = fileMetaData.batchMetaData.existingUploads.some(
            upload =>
                upload.fileType === fileType &&
                upload.batchId === batchId &&
                (upload.status === "COMPLETED" || upload.status === "VALIDATED")
        );

        return fileExists;
    } catch (error) {
        const errorMessage = `Error while checking for existing valid data files for Data Submission ID ${dataSubmissionId} Batch ID: ${batchId} File Type: ${fileType} with error: ${error} `;
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

async function createFileFromPath(filePath: string): Promise<File> {
    const fileName = path.basename(filePath);
    const fileBuffer = await fs.readFile(filePath);
    const blobFile = new Blob([fileBuffer], { type: "application/octet-stream" });
    return new File([blobFile], fileName, {
        type: blobFile.type,
        lastModified: Date.now(),
    });
}

function validateFile(file: File, dataRepository: any): Promise<FileData> {
    return new Promise<FileData>((resolve, reject) => {
        dataRepository.validate(file).run(
            (data: any) => {
                if (isValidFileDataType(data)) {
                    resolve(data);
                } else {
                    const errorMessage = `Invalid data format returned from validate ${file.name} receivedData: ${data} `;
                    log(errorMessage, LogLevel.ERROR);
                    reject(new Error(errorMessage));
                }
            },
            (error: any) => {
                const enhancedError = new Error("Validation failed: " + (error.message || error));
                console.error("An error occurred during validation:", {
                    errorMessage: error.message || error,
                    stack: error.stack,
                    errorObject: error,
                });
                errorMessages.push(enhancedError.message);
                reject(enhancedError);
            }
        );
    });
}
/*
================================================================
FILE PROCESSING FUNCTIONS
================================================================
*/

async function uploadFileToDataStore(fileMetaData: FileMetaData): Promise<FileMetaData> {
    try {
        fileMetaData.fileId = await retryWithBackoff(() =>
            glassDocumentsRepository.save(fileMetaData.file, moduleName).toPromise()
        );
        console.info(
            ` ${fileMetaData.fileType} File ${fileMetaData.file.name} uploaded successfully with File ID: ${fileMetaData.fileId}`
        );
    } catch (error) {
        const errorMessage = `Error during the ${fileMetaData.fileType} file import process: ${
            fileMetaData.file.name
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
        fileName: fileMetaData.file.name,
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
        console.info(
            `Successfully saved to dataStore the upload data for ${fileMetaData.fileType} file: ${fileMetaData.file.name} with upload ID: ${uploadData.id}`
        );
        fileMetaData.fileUploadId = uploadData.id;
        return fileMetaData;
    } catch (uploadError) {
        const errorMessage = `Error saving file upload data for ${fileMetaData.fileType} file: ${
            fileMetaData.file.name
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
    console.info(`Importing data values for ${fileMetaData.fileType} file: ${fileMetaData.file.name}`);
    const startTime = Date.now();
    try {
        if (fileMetaData.fileType === "RIS") {
            /* importSummary = await importRISFile.importRISFile(
                fileMetaData.file,
                fileMetaData.batchMetaData.batchId,
                fileMetaData.batchMetaData.dataSubmission.period,
                CREATE_AND_UPDATE,
                fileMetaData.batchMetaData.dataSubmission.orgUnit,
                fileMetaData.batchMetaData.orgUnitCode,
                false
            ).toPromise();*/

            importSummary = await risDataSetImportHelper.importRISDataValues({
                inputFile: fileMetaData.file,
                year: fileMetaData.batchMetaData.dataSubmission.period,
                action: CREATE_AND_UPDATE,
                dryRun: false,
                orgUnitId: fileMetaData.batchMetaData.dataSubmission.orgUnit,
            });
        } else {
            /*importSummary = await importSampleFile.import(
                fileMetaData.file,
                fileMetaData.batchMetaData.batchId,
                fileMetaData.batchMetaData.dataSubmission.period,
                CREATE_AND_UPDATE,
                fileMetaData.batchMetaData.dataSubmission.orgUnit,
                fileMetaData.batchMetaData.orgUnitCode,
                false,
            ).toPromise();*/

            importSummary = await sampleDataSetImportHelper.importSampleDataValues(
                fileMetaData.file,
                fileMetaData.batchMetaData.dataSubmission.period,
                CREATE_AND_UPDATE,
                fileMetaData.batchMetaData.dataSubmission.orgUnit,
                false
            );
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
            const errorMessage = `File ${fileMetaData.file.name} metadata NOT imported! with importSummary status ${
                importSummary.status
            }   ${importSummary.blockingErrors.map(error => `  - ${error.error}`).join("\n")} `;
            console.error(errorMessage, LogLevel.ERROR);
            //await setUploadStatusUseCase.execute({ id: fileMetaData.fileUploadId, status: "IMPORTED" }).toPromise();
            throw new Error(errorMessage);
        } else {
            //await setUploadStatusUseCase.execute({ id: fileMetaData.fileUploadId, status: "VALIDATED" }).toPromise();
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            console.info(
                `Metadata within File ${fileMetaData.file.name} successfully imported with status ${importSummary.status} in ${elapsedSeconds} seconds`
            );
            return importSummary.status;
        }
    } catch (error) {
        const errorMessage = ` Error in the Metadata import for file: ${fileMetaData.file.name}. ${error} `;
        //console.error(errorMessage);
        throw new Error(errorMessage);
    } finally {
        dataValues_semaphore.release();
        //console.log(`datastore_semaphore released: ${datastore_semaphore.getActiveCount()} for ${fileMetaData.file.name}`);
    }
}

async function processFile(fileMetaData: FileMetaData): Promise<FileMetaData> {
    try {
        fileMetaData.fileData = await validateFile(
            fileMetaData.file,
            fileMetaData.fileType === "RIS" ? risDataRepository : sampleDataRepository
        );
        await datastore_semaphore.acquire();
        //console.log(`datastore_semaphore acquired: ${datastore_semaphore.getActiveCount()} for ${fileMetaData.file.name}`);
        fileMetaData = await uploadFileToDataStore(fileMetaData);
        return fileMetaData;
    } catch (error) {
        const errorMessage = ` An error occurred during ${fileMetaData.fileType} processing! ${fileMetaData.file.name} ${error} `;
        log(errorMessage, LogLevel.ERROR);
        fileMetaData.fileUploadId = "";
        throw new Error(errorMessage);
    } finally {
        datastore_semaphore.release();
        //console.log(`datastore_semaphore released: ${datastore_semaphore.getActiveCount()} for ${fileMetaData.file.name}`);
    }
}

async function processBatchFiles(filePath: string, batchFiles: string[], batchMetaData: BatchMetaData): Promise<void> {
    const fileName = path.basename(filePath);
    let primaryMetaDataImportSummaryStatus;
    let secondaryMetaDataImportSummaryStatus;
    await batch_semaphore.acquire();
    const startTime = Date.now();
    try {
        if (fileName.includes("RIS")) {
            let primaryFileMetaData: FileMetaData = {
                fileUploadId: "",
                fileId: "",
                fileType: "",
                file: await createFileFromPath(filePath),
                fileData: {
                    isValid: true,
                    rows: 0,
                    specimens: [],
                },
                batchMetaData: batchMetaData,
            };
            primaryFileMetaData.fileType = moduleProperties.get(moduleName)?.primaryFileType || moduleName;
            if (await checkForExistingValidDataFiles(primaryFileMetaData)) {
                const errorMessage = ` Data submission already contains ${primaryFileMetaData.fileType} files!: ${fileName} dataSubmission: ${primaryFileMetaData.batchMetaData.dataSubmission.id} `;
                log(errorMessage, LogLevel.WARN);
            } else {
                const sampleFile = batchFiles.find(f => f.includes("SAMPLE"));
                const secondaryFileMetaData: FileMetaData = {
                    fileUploadId: "",
                    fileId: "",
                    fileType: "",
                    file: await createFileFromPath(filePath),
                    fileData: {
                        isValid: true,
                        rows: 0,
                        specimens: [],
                    },
                    batchMetaData: batchMetaData,
                };
                if (sampleFile) {
                    // should add a check to see if there are any errors when uploading the primaryfile

                    const sampleFilePath = path.join(path.dirname(filePath), sampleFile);
                    secondaryFileMetaData.file = await createFileFromPath(sampleFilePath);
                    secondaryFileMetaData.fileType = moduleProperties.get(moduleName)?.secondaryFileType || moduleName;
                    //secondaryFileMetaData = await processFile(sampleFilePath, batchMetaData, secondaryFileType);
                    //const [primaryMetaData, secondaryMetaData] = await Promise.all([

                    //As the semaphore for the dataStore has max thread limit of 1 this is basically synchronous anyway.
                    //But if I want to run processBatchFiles Concurrently I might see minor benefits.
                    //async
                    [primaryMetaDataImportSummaryStatus, secondaryMetaDataImportSummaryStatus] = await Promise.all([
                        retryWithBackoff(() => uploadDataValues(primaryFileMetaData)),
                        retryWithBackoff(() => uploadDataValues(secondaryFileMetaData)),
                        processFile(primaryFileMetaData),
                        processFile(secondaryFileMetaData),
                    ]);

                    //synchronous
                    //const primaryMetaDataImportSummaryStatus = await uploadDataValues(primaryFileMetaData);

                    /*secondaryMetaDataImportSummaryStatus = await retryWithBackoff(
                        () => uploadDataValues(secondaryFileMetaData),  
                        3,                         
                        1000,                       
                        10000,                      
                    );*/
                } else {
                    console.warn(` No corresponding SAMPLE file found for RIS file: ${fileName} `);

                    [primaryFileMetaData, primaryMetaDataImportSummaryStatus] = await Promise.all([
                        processFile(primaryFileMetaData),
                        retryWithBackoff(() => uploadDataValues(primaryFileMetaData)),
                    ]);
                }

                //handlePostUploadBatchFileUpdates
                await datastore_semaphore.acquire();
                //console.log(`datastore_semaphore acquire for handlePostUploadBatchFileUpdates for ${primaryFileMetaData.file.name}: ${datastore_semaphore.getActiveCount()}`);
                try {
                    await handlePostUploadBatchDatastoreUpdates(
                        primaryFileMetaData.fileUploadId,
                        batchMetaData.dataSubmission.id,
                        secondaryFileMetaData.fileUploadId
                    );
                    console.warn(
                        `Completed handlePostUploadBatchDatastoreUpdates for : ${primaryFileMetaData.file.name}`
                    );
                } catch (uploadError) {
                    const errorMessage = `Error handlePostUploadBatchFileUpdates for ${
                        primaryFileMetaData.file.name
                    }, ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
                    log(errorMessage, LogLevel.ERROR);
                } finally {
                    datastore_semaphore.release();
                    //console.log(`datastore_semaphore release for handlePostUploadBatchFileUpdates for ${primaryFileMetaData.file.name}: ${datastore_semaphore.getActiveCount()}`);
                }
            }
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            console.warn(`All metadata and dataStore updates done for this batch in ${elapsedSeconds} seconds `);
        } else if (fileName.includes("SAMPLE")) {
            //const risFile = batchFiles.find(f => f.includes("RIS"));
            const errorMessage = ` Encountered a SAMPLE file without a corresponding RIS file. Sample fileName: ${fileName} `;
            log(errorMessage, LogLevel.ERROR);
        } else {
            log(`Unrecognized file type: ${fileName}`, LogLevel.ERROR);
        }
    } catch (error) {
        const errorMessage = `Error processing file: ${fileName}: ${
            error instanceof Error ? error.message : String(error)
        } `;
        log(errorMessage, LogLevel.ERROR);
    } finally {
        batch_semaphore.release();
    }
}

async function handlePostUploadBatchDatastoreUpdates(
    primaryFileUploadId: string,
    submissionId: string,
    secondaryFileUploadId?: string
) {
    if (!primaryFileUploadId) {
        const errorMessage = `Cannot update secondary file ${secondaryFileUploadId} with primary file upload ID because the primary file ID is empty.`;
        log(errorMessage, LogLevel.ERROR);
        throw new Error(errorMessage);
    }

    try {
        //let promises: Promise<any>[];

        await retryWithBackoff(() =>
            setUploadStatusUseCase.execute({ id: primaryFileUploadId, status: "COMPLETED" }).toPromise()
        );
        if (secondaryFileUploadId) {
            await retryWithBackoff(() =>
                setUploadStatusUseCase.execute({ id: secondaryFileUploadId, status: "COMPLETED" }).toPromise()
            );
            await retryWithBackoff(() =>
                updateSecondaryFileWithPrimaryId.execute(secondaryFileUploadId, primaryFileUploadId).toPromise()
            );
        }
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
        const errorMessage = `Error during the update of statuses for submission ${submissionId}, secondary file ${secondaryFileUploadId}, or primary file ${primaryFileUploadId}: ${
            error instanceof Error ? error.message : String(error)
        }`;
        log(errorMessage, LogLevel.ERROR);
        throw new Error(errorMessage);
    }
}

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
                    authPromise = authenticate(); // Start the authentication process
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

async function processDirectory(directoryPath: string): Promise<void> {
    const files = await fs.readdir(directoryPath);
    //const files = fs.readdirSync(directoryPath);
    files.sort((a: string, b: string) => a.localeCompare(b)); // Sort so that the RIS comes before the SAMPLE file to make the below logic work correctly

    //for (const file of files) {
    await Promise.all(
        files.map(async file => {
            const filePath = path.join(directoryPath, file);

            try {
                if ((await fs.lstat(filePath)).isDirectory()) {
                    await processDirectory(filePath);
                } else {
                    const fileName = path.basename(filePath);
                    
                    let beforeDot;
                    if (fileName.includes(".")) {
                        beforeDot = fileName.split(".")[0];
                    } else {
                        throw Error("The file name does not contain a dot.");
                    }
                    const batchId = beforeDot.substring(beforeDot.lastIndexOf("_") + 1);

                    const [firstFileType, orgUnitCode, period] = fileName.split("_");
                    const orgUnitId = orgUnits[orgUnitCode];

                    let dataSubmission = getDataSubmission(orgUnitId, period);

                    //const existingUploads = await glassUploadsRepository.getUploadsByDataSubmission(dataSubmission.id).toPromise();
                    if (!dataSubmission) {
                        log(`No dataSubmission found for orgUnitId: ${orgUnitId} and period ${period}`, LogLevel.WARN);
                        saveDataSubmissions.execute(moduleId, orgUnitId, [period]);
                        dataSubmission = await fetchDataSubmissionId(moduleId, moduleName, orgUnitId, period);
                        log(`Created a dataSubmission for orgUnitId: ${orgUnitId} and period ${period}`, LogLevel.WARN);
                    }

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

                    if (firstFileType === "RIS") {
                        await processBatchFiles(filePath, files, batchMetaData);
                    }
                }
            } catch (error) {
                const errorMessage = `Error processing Directory: ${path.basename(filePath)}: ${error} `;
                log(errorMessage, LogLevel.ERROR);
                throw new Error(errorMessage);
            }
        })
    );
}

async function main() {
    const startTime = Date.now();
    await initializeGlobals();
    const rootDirectory =
        "C:/Users/odohertyd/OneDrive - World Health Organization/Documents/Python projects/HistoricalDataAMR_1";

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

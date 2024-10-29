import { command, run } from "cmd-ts";
import { Blob } from "buffer";

import { getD2ApiFromArgs, getInstance } from "./common";
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { Id } from "../domain/entities/Ref";
import { GetAsyncDeletionsUseCase } from "../domain/usecases/GetAsyncDeletionsUseCase";
import { GlassUploadsRepository } from "../domain/repositories/GlassUploadsRepository";
import { GlassUploadsDefaultRepository } from "../data/repositories/GlassUploadsDefaultRepository";
import { GetGlassUploadsUseCase } from "../domain/usecases/GetGlassUploadsUseCase";
import { Future, FutureData } from "../domain/entities/Future";
import { GlassModule } from "../domain/entities/GlassModule";
import { GlassModuleRepository } from "../domain/repositories/GlassModuleRepository";
import { GlassUploads } from "../domain/entities/GlassUploads";
import { GlassModuleDefaultRepository } from "../data/repositories/GlassModuleDefaultRepository";
import { moduleProperties } from "../domain/utils/ModuleProperties";
import { getPrimaryAndSecondaryFilesToDelete } from "../webapp/utils/getPrimaryAndSecondaryFilesToDelete";
import { DownloadDocumentUseCase } from "../domain/usecases/DownloadDocumentUseCase";
import { GlassDocumentsRepository } from "../domain/repositories/GlassDocumentsRepository";
import { GlassDocumentsDefaultRepository } from "../data/repositories/GlassDocumentsDefaultRepository";
import { UploadsDataItem } from "../webapp/entities/uploads";
import { ImportSummary } from "../domain/entities/data-entry/ImportSummary";
import { RISDataCSVDefaultRepository } from "../data/repositories/data-entry/RISDataCSVDefaultRepository";
import { RISIndividualFungalDataCSVDefaultRepository } from "../data/repositories/data-entry/RISIndividualFungalDataCSVDefaultRepository";
import { SampleDataCSVDeafultRepository } from "../data/repositories/data-entry/SampleDataCSVDeafultRepository";
import { RISDataRepository } from "../domain/repositories/data-entry/RISDataRepository";
import { RISIndividualFungalDataRepository } from "../domain/repositories/data-entry/RISIndividualFungalDataRepository";
import { MetadataRepository } from "../domain/repositories/MetadataRepository";
import { DataValuesRepository } from "../domain/repositories/data-entry/DataValuesRepository";
import { Dhis2EventsDefaultRepository } from "../data/repositories/Dhis2EventsDefaultRepository";
import { ExcelRepository } from "../domain/repositories/ExcelRepository";
import { TrackerRepository } from "../domain/repositories/TrackerRepository";
import { InstanceDefaultRepository } from "../data/repositories/InstanceDefaultRepository";
import { ProgramRulesMetadataRepository } from "../domain/repositories/program-rules/ProgramRulesMetadataRepository";
import { GlassATCDefaultRepository } from "../data/repositories/GlassATCDefaultRepository";
import { AMCProductDataRepository } from "../domain/repositories/data-entry/AMCProductDataRepository";
import { AMCSubstanceDataRepository } from "../domain/repositories/data-entry/AMCSubstanceDataRepository";
import { InstanceRepository } from "../domain/repositories/InstanceRepository";
import { GlassATCRepository } from "../domain/repositories/GlassATCRepository";
import { SampleDataRepository } from "../domain/repositories/data-entry/SampleDataRepository";
import { AMCProductDataDefaultRepository } from "../data/repositories/data-entry/AMCProductDataDefaultRepository";
import { AMCSubstanceDataDefaultRepository } from "../data/repositories/data-entry/AMCSubstanceDataDefaultRepository";
import { DataValuesDefaultRepository } from "../data/repositories/data-entry/DataValuesDefaultRepository";
import { ExcelPopulateDefaultRepository } from "../data/repositories/ExcelPopulateDefaultRepository";
import { MetadataDefaultRepository } from "../data/repositories/MetadataDefaultRepository";
import { ProgramRulesMetadataDefaultRepository } from "../data/repositories/program-rule/ProgramRulesMetadataDefaultRepository";
import { TrackerDefaultRepository } from "../data/repositories/TrackerDefaultRepository";
import { DeleteDocumentInfoByUploadIdUseCase } from "../domain/usecases/DeleteDocumentInfoByUploadIdUseCase";
import { DeleteAMCProductLevelDataUseCase } from "../domain/usecases/data-entry/amc/DeleteAMCProductLevelDataUseCase";
import { DeleteAMCSubstanceLevelDataUseCase } from "../domain/usecases/data-entry/amc/DeleteAMCSubstanceLevelDataUseCase";
import { RemoveAsyncDeletionsUseCase } from "../domain/usecases/RemoveAsyncDeletionsUseCase";
import { SendNotificationsUseCase } from "../domain/usecases/SendNotificationsUseCase";
import { NotificationRepository } from "../domain/repositories/NotificationRepository";
import { UsersRepository } from "../domain/repositories/UsersRepository";
import { DeleteRISDatasetUseCase } from "../domain/usecases/data-entry/amr/DeleteRISDatasetUseCase";
import { DeleteEGASPDatasetUseCase } from "../domain/usecases/data-entry/egasp/DeleteEGASPDatasetUseCase";
import { DeleteRISIndividualFungalFileUseCase } from "../domain/usecases/data-entry/amr-individual-fungal/DeleteRISIndividualFungalFileUseCase";

const UPLOADED_FILE_STATUS_LOWERCASE = "uploaded";
const IMPORT_SUMMARY_STATUS_ERROR = "ERROR";

async function main() {
    const cmd = command({
        name: "Async deletions of uploaded files",
        description:
            "This script takes the ids of uploaded files that are in async-deletions in Datastore and deletes them",
        args: {},
        handler: async () => {
            try {
                if (!process.env.REACT_APP_DHIS2_BASE_URL)
                    throw new Error("REACT_APP_DHIS2_BASE_URL  must be set in the .env file");

                if (!process.env.REACT_APP_DHIS2_AUTH)
                    throw new Error("REACT_APP_DHIS2_BASE_URL  must be set in the .env file");

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

                const api = getD2ApiFromArgs(envVars);
                const instance = getInstance(envVars);
                const dataStoreClient = new DataStoreClient(instance);

                const instanceRepository = new InstanceDefaultRepository(instance, dataStoreClient);
                const glassModuleRepository = new GlassModuleDefaultRepository(dataStoreClient);
                const glassUploadsRepository = new GlassUploadsDefaultRepository(dataStoreClient);
                const glassDocumentsRepository = new GlassDocumentsDefaultRepository(dataStoreClient, instance);
                const risDataRepository = new RISDataCSVDefaultRepository();
                const risIndividualFungalRepository = new RISIndividualFungalDataCSVDefaultRepository();
                const sampleDataRepository = new SampleDataCSVDeafultRepository();
                const dataValuesRepository = new DataValuesDefaultRepository(instance);
                const metadataRepository = new MetadataDefaultRepository(instance);
                const dhis2EventsDefaultRepository = new Dhis2EventsDefaultRepository(instance);
                const excelRepository = new ExcelPopulateDefaultRepository();
                const programRulesMetadataDefaultRepository = new ProgramRulesMetadataDefaultRepository(instance);
                const trackerRepository = new TrackerDefaultRepository(instance);
                const amcProductDataRepository = new AMCProductDataDefaultRepository(api);
                const amcSubstanceDataRepository = new AMCSubstanceDataDefaultRepository(api);
                const glassAtcRepository = new GlassATCDefaultRepository(dataStoreClient);
                const atcRepository = new GlassATCDefaultRepository(dataStoreClient);

                console.debug(`Running asynchronous deletion for URL ${envVars.url}`);

                return getAsyncDeletionsFromDatastore(glassUploadsRepository).run(
                    uploadIdsToDelete => {
                        if (uploadIdsToDelete && uploadIdsToDelete.length > 0) {
                            console.debug(
                                `There are ${uploadIdsToDelete.length} uploaded datasets marked for deletion`
                            );
                            return Future.joinObj({
                                glassModules: getGlassModulesFromDatastore(glassModuleRepository),
                                allUploads: getGlassUploadsDatastore(glassUploadsRepository),
                            }).run(
                                ({ glassModules, allUploads }) => {
                                    const uploadsToDelete: GlassUploadsWithModuleName[] = allUploads
                                        .filter(upload => uploadIdsToDelete.includes(upload.id))
                                        .map(upload => {
                                            const moduleName = glassModules.find(
                                                module => module.id === upload.module
                                            )?.name;

                                            if (!moduleName) {
                                                console.error(`Module name not found for upload ${upload.id}`);
                                                throw new Error(`Module name not found for upload ${upload.id}`);
                                            }

                                            return {
                                                ...upload,
                                                moduleName: moduleName || "",
                                            };
                                        });

                                    if (uploadsToDelete.length === 0) {
                                        console.error(`ERROR - Uploads to delete not found in Datastore`);
                                        return Future.error(`Uploads to delete not found in Datastore`);
                                    }

                                    return deleteUploadedDatasets(uploadsToDelete, allUploads, {
                                        sampleDataRepository,
                                        metadataRepository,
                                        dataValuesRepository,
                                        excelRepository,
                                        instanceRepository,
                                        glassDocumentsRepository,
                                        glassUploadsRepository,
                                        dhis2EventsDefaultRepository,
                                        programRulesMetadataRepository: programRulesMetadataDefaultRepository,
                                        glassAtcRepository,
                                        risDataRepository,
                                        risIndividualFungalRepository,
                                        trackerRepository,
                                        glassModuleRepository,
                                        atcRepository,
                                        amcProductRepository: amcProductDataRepository,
                                        amcSubstanceDataRepository,
                                    }).run(
                                        () => {
                                            console.debug(
                                                `SUCCESS - Deleted all uploaded datasets marked for deletion: ${uploadIdsToDelete.length}`
                                            );
                                            return removeAsyncDeletionsFromDatastore(
                                                uploadIdsToDelete,
                                                glassUploadsRepository
                                            ).run(
                                                () => {
                                                    console.debug(
                                                        `SUCCESS - Deleted async-deletions ids from Datastore ${uploadIdsToDelete}`
                                                    );
                                                },
                                                error => {
                                                    console.error(
                                                        `ERROR - An error occured while deleting async-deletions ids from Datastore: ${error}`
                                                    );
                                                }
                                            );
                                        },
                                        error => {
                                            console.error(`ERROR - An error occured while deleting: ${error}`);
                                        }
                                    );
                                },
                                error =>
                                    console.error(
                                        `ERROR - Error while getting glass modules and all uploads from Datastore, and all countries: ${error}.`
                                    )
                            );
                        } else {
                            console.debug(`There is nothing marked for deletion`);
                        }
                    },
                    error => console.error(`ERROR - Error while getting async deletions from Datastore: ${error}.`)
                );
            } catch (e) {
                console.error(`Async deletions have stopped with error: ${e}. Please, restart again.`);
                process.exit(1);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

type GlassUploadsWithModuleName = GlassUploads & { moduleName: string };

function getAsyncDeletionsFromDatastore(glassUploadsRepository: GlassUploadsRepository): FutureData<Id[]> {
    return new GetAsyncDeletionsUseCase(glassUploadsRepository).execute();
}

function removeAsyncDeletionsFromDatastore(
    uploadIdsToRemove: Id[],
    glassUploadsRepository: GlassUploadsRepository
): FutureData<Id[]> {
    return new RemoveAsyncDeletionsUseCase(glassUploadsRepository).execute(uploadIdsToRemove);
}

// TODO: send notification to users
function _sendNotification(
    usergroupIds: Id[],
    repositories: {
        notificationRepository: NotificationRepository;
        usersRepository: UsersRepository;
    }
): FutureData<void> {
    const { notificationRepository, usersRepository } = repositories;
    const notificationText = `The datasets marked for deletion have been successfully deleted.`;
    const notOrgUnitPath = "";
    return new SendNotificationsUseCase(notificationRepository, usersRepository).execute(
        notificationText,
        notificationText,
        usergroupIds,
        notOrgUnitPath
    );
}

function getGlassModulesFromDatastore(glassModuleRepository: GlassModuleRepository): FutureData<GlassModule[]> {
    return glassModuleRepository.getAll();
}

function getGlassUploadsDatastore(glassUploadsRepository: GlassUploadsRepository): FutureData<GlassUploads[]> {
    return new GetGlassUploadsUseCase(glassUploadsRepository).execute();
}

function fromBlobToArrayBuffer(blob: Blob): FutureData<ArrayBuffer> {
    return Future.fromPromise(blob.arrayBuffer());
}

function downloadDocument(
    fileId: Id,
    repositories: { glassDocumentsRepository: GlassDocumentsRepository }
): FutureData<Blob> {
    const { glassDocumentsRepository } = repositories;
    return new DownloadDocumentUseCase(glassDocumentsRepository).execute(fileId);
}

function getArrayBufferOfFile(
    fileId: Id,
    repositories: { glassDocumentsRepository: GlassDocumentsRepository }
): FutureData<ArrayBuffer> {
    return downloadDocument(fileId, repositories).flatMap(blob => fromBlobToArrayBuffer(blob));
}

function deleteUploadAndDocumentFromDatasoreAndDHIS2(
    upload: GlassUploads,
    repositories: {
        glassDocumentsRepository: GlassDocumentsRepository;
        glassUploadsRepository: GlassUploadsRepository;
    }
): FutureData<void> {
    const { glassDocumentsRepository, glassUploadsRepository } = repositories;
    return new DeleteDocumentInfoByUploadIdUseCase(glassDocumentsRepository, glassUploadsRepository)
        .execute(upload.id)
        .flatMap(() => {
            console.debug(`Upload and document ${upload.fileName} deleted in Datastore and from DHIS2 documents`);
            return Future.success(undefined);
        });
}

function deleteDatasetValuesOrEventsFromPrimaryUploaded(
    currentModuleName: string,
    repositories: {
        glassDocumentsRepository: GlassDocumentsRepository;
        risDataRepository: RISDataRepository;
        risIndividualFungalRepository: RISIndividualFungalDataRepository;
        metadataRepository: MetadataRepository;
        dataValuesRepository: DataValuesRepository;
        dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository;
        excelRepository: ExcelRepository;
        glassUploadsRepository: GlassUploadsRepository;
        trackerRepository: TrackerRepository;
        glassModuleRepository: GlassModuleRepository;
        instanceRepository: InstanceRepository;
        programRulesMetadataRepository: ProgramRulesMetadataRepository;
        atcRepository: GlassATCRepository;
        amcProductRepository: AMCProductDataRepository;
        amcSubstanceDataRepository: AMCSubstanceDataRepository;
        glassAtcRepository: GlassATCRepository;
    },
    arrayBuffer: ArrayBuffer,
    orgUnitId: string,
    eventListId: string | undefined,
    calculatedEventListFileId?: string
): FutureData<ImportSummary> {
    switch (currentModuleName) {
        case "AMR": {
            return new DeleteRISDatasetUseCase(repositories).execute(arrayBuffer);
        }

        case "EGASP": {
            return new DeleteEGASPDatasetUseCase(repositories).execute(arrayBuffer, eventListId);
        }

        case "AMR - Individual":
        case "AMR - Fungal": {
            return new DeleteRISIndividualFungalFileUseCase(repositories).execute(orgUnitId, eventListId);
        }

        case "AMC": {
            return new DeleteAMCProductLevelDataUseCase(repositories).execute(
                arrayBuffer,
                eventListId,
                orgUnitId,
                calculatedEventListFileId
            );
        }
        default: {
            return Future.error(`Module ${currentModuleName} not found`);
        }
    }
}

function deleteDatasetValuesOrEventsFromSecondaryUploaded(
    currentModuleName: string,
    repositories: {
        sampleDataRepository: SampleDataRepository;
        metadataRepository: MetadataRepository;
        dataValuesRepository: DataValuesRepository;
        excelRepository: ExcelRepository;
        instanceRepository: InstanceRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
        glassUploadsRepository: GlassUploadsRepository;
        dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository;
        programRulesMetadataRepository: ProgramRulesMetadataRepository;
        glassAtcRepository: GlassATCRepository;
    },
    arrayBuffer: ArrayBuffer,
    eventListId: string | undefined,
    calculatedEventListFileId?: string
): FutureData<ImportSummary> {
    switch (currentModuleName) {
        case "AMC": {
            return new DeleteAMCSubstanceLevelDataUseCase(repositories).execute(
                arrayBuffer,
                eventListId,
                calculatedEventListFileId
            );
        }
        default: {
            return Future.error(`Module ${currentModuleName} not found`);
        }
    }
}

function deleteDatasetValuesOrEvents(
    primaryFileToDelete: UploadsDataItem | undefined,
    secondaryFileToDelete: UploadsDataItem | undefined,
    primaryArrayBuffer: ArrayBuffer | undefined,
    secondaryArrayBuffer: ArrayBuffer | undefined,
    currentModuleName: string,
    repositories: {
        sampleDataRepository: SampleDataRepository;
        metadataRepository: MetadataRepository;
        dataValuesRepository: DataValuesRepository;
        excelRepository: ExcelRepository;
        instanceRepository: InstanceRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
        glassUploadsRepository: GlassUploadsRepository;
        dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository;
        programRulesMetadataRepository: ProgramRulesMetadataRepository;
        glassAtcRepository: GlassATCRepository;
        risDataRepository: RISDataRepository;
        risIndividualFungalRepository: RISIndividualFungalDataRepository;
        trackerRepository: TrackerRepository;
        glassModuleRepository: GlassModuleRepository;
        atcRepository: GlassATCRepository;
        amcProductRepository: AMCProductDataRepository;
        amcSubstanceDataRepository: AMCSubstanceDataRepository;
    }
): FutureData<{
    deletePrimaryFileSummary: ImportSummary | undefined;
    deleteSecondaryFileSummary: ImportSummary | undefined;
}> {
    return Future.joinObj({
        deletePrimaryFileSummary:
            primaryArrayBuffer &&
            primaryFileToDelete &&
            (primaryFileToDelete.status.toLowerCase() !== UPLOADED_FILE_STATUS_LOWERCASE ||
                !moduleProperties.get(currentModuleName)?.isDryRunReq)
                ? deleteDatasetValuesOrEventsFromPrimaryUploaded(
                      currentModuleName,
                      repositories,
                      primaryArrayBuffer,
                      primaryFileToDelete.orgUnit,
                      primaryFileToDelete.eventListFileId,
                      primaryFileToDelete.calculatedEventListFileId
                  )
                : Future.success(undefined),
        deleteSecondaryFileSummary:
            secondaryArrayBuffer &&
            secondaryFileToDelete &&
            secondaryFileToDelete.status.toLowerCase() !== UPLOADED_FILE_STATUS_LOWERCASE
                ? deleteDatasetValuesOrEventsFromSecondaryUploaded(
                      currentModuleName,
                      repositories,
                      secondaryArrayBuffer,
                      secondaryFileToDelete.eventListFileId
                  )
                : Future.success(undefined),
    });
}

// Deleting a uploaded dataset completely has the following steps:
// 1. Delete corresponsding datasetValue/event for each row in the file if the file has status different than "uploaded"
// 2. Delete corresponding 'upload' and 'document' from Datastore, and delete corresponding document from DHIS2
function deleteUploadedDatasets(
    uploadsToDelete: GlassUploadsWithModuleName[],
    allUploads: GlassUploads[],
    repositories: {
        sampleDataRepository: SampleDataRepository;
        metadataRepository: MetadataRepository;
        dataValuesRepository: DataValuesRepository;
        excelRepository: ExcelRepository;
        instanceRepository: InstanceRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
        glassUploadsRepository: GlassUploadsRepository;
        dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository;
        programRulesMetadataRepository: ProgramRulesMetadataRepository;
        glassAtcRepository: GlassATCRepository;
        risDataRepository: RISDataRepository;
        risIndividualFungalRepository: RISIndividualFungalDataRepository;
        trackerRepository: TrackerRepository;
        glassModuleRepository: GlassModuleRepository;
        atcRepository: GlassATCRepository;
        amcProductRepository: AMCProductDataRepository;
        amcSubstanceDataRepository: AMCSubstanceDataRepository;
    }
): FutureData<void> {
    return Future.sequential(
        uploadsToDelete.map(uploadToDelete => {
            const { primaryFileToDelete, secondaryFileToDelete } = getPrimaryAndSecondaryFilesToDelete(
                uploadToDelete,
                moduleProperties,
                uploadToDelete.moduleName,
                allUploads
            );

            return Future.joinObj({
                primaryArrayBuffer: primaryFileToDelete
                    ? getArrayBufferOfFile(primaryFileToDelete.fileId, repositories)
                    : Future.success(undefined),
                secondaryArrayBuffer: secondaryFileToDelete
                    ? getArrayBufferOfFile(secondaryFileToDelete.fileId, repositories)
                    : Future.success(undefined),
            }).flatMap(({ primaryArrayBuffer, secondaryArrayBuffer }) => {
                if (primaryFileToDelete && primaryArrayBuffer) {
                    return deleteDatasetValuesOrEvents(
                        primaryFileToDelete,
                        secondaryFileToDelete,
                        primaryArrayBuffer,
                        secondaryArrayBuffer,
                        uploadToDelete.moduleName,
                        repositories
                    ).flatMap(({ deletePrimaryFileSummary, deleteSecondaryFileSummary }) => {
                        if (
                            deletePrimaryFileSummary?.status === IMPORT_SUMMARY_STATUS_ERROR ||
                            deleteSecondaryFileSummary?.status === IMPORT_SUMMARY_STATUS_ERROR
                        ) {
                            return Future.error(
                                `An error occured while deleting the data exiting. Primary file: ${primaryFileToDelete.fileName}, secondary file: ${secondaryFileToDelete?.fileName}`
                            );
                        }

                        if (deletePrimaryFileSummary) {
                            console.debug(`Data from primary file ${primaryFileToDelete.fileName} deleted`);
                        }

                        if (secondaryFileToDelete && deleteSecondaryFileSummary) {
                            console.debug(`Data from secondary file ${secondaryFileToDelete.fileName} deleted`);
                        }

                        return deleteUploadAndDocumentFromDatasoreAndDHIS2(primaryFileToDelete, repositories).flatMap(
                            () => {
                                if (secondaryFileToDelete) {
                                    return deleteUploadAndDocumentFromDatasoreAndDHIS2(
                                        secondaryFileToDelete,
                                        repositories
                                    );
                                } else {
                                    return Future.success(undefined);
                                }
                            }
                        );
                    });
                } else if (secondaryFileToDelete && secondaryArrayBuffer) {
                    if (secondaryFileToDelete.status.toLowerCase() !== UPLOADED_FILE_STATUS_LOWERCASE) {
                        console.debug("Delete only secondary uploaded dataset");
                        return deleteDatasetValuesOrEventsFromSecondaryUploaded(
                            uploadToDelete.moduleName,
                            repositories,
                            secondaryArrayBuffer,
                            secondaryFileToDelete.eventListFileId,
                            secondaryFileToDelete.calculatedEventListFileId
                        ).flatMap(deleteSecondaryFileSummary => {
                            if (
                                deleteSecondaryFileSummary &&
                                deleteSecondaryFileSummary.status !== IMPORT_SUMMARY_STATUS_ERROR
                            ) {
                                console.debug(`Data from secondary file ${secondaryFileToDelete.fileName} deleted`);
                                return deleteUploadAndDocumentFromDatasoreAndDHIS2(secondaryFileToDelete, repositories);
                            } else {
                                return Future.error(
                                    `An error occured while deleting the data exiting. Secondary file: ${secondaryFileToDelete?.fileName}`
                                );
                            }
                        });
                    } else {
                        return deleteUploadAndDocumentFromDatasoreAndDHIS2(secondaryFileToDelete, repositories);
                    }
                } else {
                    return Future.error(
                        `An error occured while deleting file, file not found. Upload selected to delete: ${uploadToDelete.id}`
                    );
                }
            });
        })
    ).toVoid();
}

main();

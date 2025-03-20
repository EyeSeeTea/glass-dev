import { command, run } from "cmd-ts";
import "dotenv/config";

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
import { GlassModuleName, isGlassModuleName, moduleProperties } from "../domain/utils/ModuleProperties";
import { getPrimaryAndSecondaryFilesToDelete } from "../webapp/utils/getPrimaryAndSecondaryFilesToDelete";
import { GlassDocumentsRepository } from "../domain/repositories/GlassDocumentsRepository";
import { GlassDocumentsDefaultRepository } from "../data/repositories/GlassDocumentsDefaultRepository";
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
import { RemoveAsyncDeletionsUseCase } from "../domain/usecases/RemoveAsyncDeletionsUseCase";
import { SendNotificationsUseCase } from "../domain/usecases/SendNotificationsUseCase";
import { NotificationRepository } from "../domain/repositories/NotificationRepository";
import { UsersRepository } from "../domain/repositories/UsersRepository";
import { DeletePrimaryFileDataUseCase } from "../domain/usecases/data-entry/DeletePrimaryFileDataUseCase";
import { DeleteSecondaryFileDataUseCase } from "../domain/usecases/data-entry/DeleteSecondaryFileDataUseCase";
import { DownloadDocumentAsArrayBufferUseCase } from "../domain/usecases/DownloadDocumentAsArrayBufferUseCase";

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
                    throw new Error("REACT_APP_DHIS2_AUTH  must be set in the .env file");

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

                                            if (!isGlassModuleName(moduleName)) {
                                                console.error(`Module name not found for upload ${upload.id}`);
                                                throw new Error(`Module name not found for upload ${upload.id}`);
                                            }

                                            return {
                                                ...upload,
                                                moduleName: moduleName,
                                            };
                                        });

                                    if (uploadsToDelete.length === 0) {
                                        console.error(`ERROR - Uploads to delete not found in Datastore`);
                                        return Future.error(`Uploads to delete not found in Datastore`);
                                    }

                                    return deleteUploadedDatasets(uploadsToDelete, allUploads, glassModules, {
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

type GlassUploadsWithModuleName = GlassUploads & { moduleName: GlassModuleName };

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

function getArrayBufferOfFile(
    fileId: Id,
    repositories: { glassDocumentsRepository: GlassDocumentsRepository }
): FutureData<ArrayBuffer> {
    return new DownloadDocumentAsArrayBufferUseCase(repositories.glassDocumentsRepository).execute(fileId);
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
    currentModule: GlassModule,
    upload: GlassUploads,
    arrayBuffer: ArrayBuffer,
    repositories: {
        risDataRepository: RISDataRepository;
        metadataRepository: MetadataRepository;
        dataValuesRepository: DataValuesRepository;
        dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository;
        excelRepository: ExcelRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
        instanceRepository: InstanceRepository;
        glassUploadsRepository: GlassUploadsRepository;
        trackerRepository: TrackerRepository;
        amcSubstanceDataRepository: AMCSubstanceDataRepository;
    }
): FutureData<ImportSummary> {
    console.debug(`Deleting data from primary file ${upload.id}`);
    return new DeletePrimaryFileDataUseCase(repositories).execute(currentModule, upload, arrayBuffer);
}

function deleteDatasetValuesOrEventsFromSecondaryUploaded(
    currentModule: GlassModule,
    upload: GlassUploads,
    arrayBuffer: ArrayBuffer,
    repositories: {
        sampleDataRepository: SampleDataRepository;
        dataValuesRepository: DataValuesRepository;
        dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository;
        excelRepository: ExcelRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
        metadataRepository: MetadataRepository;
        instanceRepository: InstanceRepository;
        glassUploadsRepository: GlassUploadsRepository;
        trackerRepository: TrackerRepository;
    }
): FutureData<ImportSummary> {
    console.debug(`Deleting data from secondary file ${upload.id}`);
    return new DeleteSecondaryFileDataUseCase(repositories).execute(currentModule, upload, arrayBuffer);
}

function deleteDatasetValuesOrEvents(
    primaryFileToDelete: GlassUploads | undefined,
    secondaryFileToDelete: GlassUploads | undefined,
    primaryArrayBuffer: ArrayBuffer | undefined,
    secondaryArrayBuffer: ArrayBuffer | undefined,
    currentModule: GlassModule,
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
    const { name: currentModuleName } = currentModule;
    return Future.joinObj({
        deletePrimaryFileSummary:
            primaryArrayBuffer &&
            primaryFileToDelete &&
            (primaryFileToDelete.status.toLowerCase() !== UPLOADED_FILE_STATUS_LOWERCASE ||
                !moduleProperties.get(currentModuleName)?.isDryRunReq)
                ? deleteDatasetValuesOrEventsFromPrimaryUploaded(
                      currentModule,
                      primaryFileToDelete,
                      primaryArrayBuffer,
                      repositories
                  )
                : Future.success(undefined),
        deleteSecondaryFileSummary:
            secondaryArrayBuffer &&
            secondaryFileToDelete &&
            secondaryFileToDelete.status.toLowerCase() !== UPLOADED_FILE_STATUS_LOWERCASE
                ? deleteDatasetValuesOrEventsFromSecondaryUploaded(
                      currentModule,
                      secondaryFileToDelete,
                      secondaryArrayBuffer,
                      repositories
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
    glassModules: GlassModule[],
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
            return Future.fromPromise(new Promise(resolve => setTimeout(resolve, 500))).flatMap(() => {
                const { primaryFileToDelete, secondaryFileToDelete } = getPrimaryAndSecondaryFilesToDelete(
                    uploadToDelete,
                    moduleProperties,
                    uploadToDelete.moduleName,
                    allUploads
                );

                const currentModule = glassModules.find(module => module.name === uploadToDelete.moduleName);
                if (!currentModule) {
                    return Future.error(`Module ${uploadToDelete.moduleName} not found`);
                }

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
                            currentModule,
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

                            return deleteUploadAndDocumentFromDatasoreAndDHIS2(
                                primaryFileToDelete,
                                repositories
                            ).flatMap(() => {
                                if (secondaryFileToDelete) {
                                    return deleteUploadAndDocumentFromDatasoreAndDHIS2(
                                        secondaryFileToDelete,
                                        repositories
                                    ).flatMap(() => {
                                        return removeAsyncDeletionsFromDatastore(
                                            [primaryFileToDelete.id],
                                            repositories.glassUploadsRepository
                                        ).flatMap(() => {
                                            console.debug(
                                                `SUCCESS - Deleted async-deletions id from Datastore ${primaryFileToDelete.id}`
                                            );
                                            return Future.success(undefined);
                                        });
                                    });
                                } else {
                                    return removeAsyncDeletionsFromDatastore(
                                        [primaryFileToDelete.id],
                                        repositories.glassUploadsRepository
                                    ).flatMap(() => {
                                        console.debug(
                                            `SUCCESS - Deleted async-deletions id from Datastore ${primaryFileToDelete.id}`
                                        );
                                        return Future.success(undefined);
                                    });
                                }
                            });
                        });
                    } else if (secondaryFileToDelete && secondaryArrayBuffer) {
                        if (secondaryFileToDelete.status.toLowerCase() !== UPLOADED_FILE_STATUS_LOWERCASE) {
                            console.debug("Delete only secondary uploaded dataset");
                            return deleteDatasetValuesOrEventsFromSecondaryUploaded(
                                currentModule,
                                secondaryFileToDelete,
                                secondaryArrayBuffer,
                                repositories
                            ).flatMap(deleteSecondaryFileSummary => {
                                if (
                                    deleteSecondaryFileSummary &&
                                    deleteSecondaryFileSummary.status !== IMPORT_SUMMARY_STATUS_ERROR
                                ) {
                                    console.debug(`Data from secondary file ${secondaryFileToDelete.fileName} deleted`);
                                    return deleteUploadAndDocumentFromDatasoreAndDHIS2(
                                        secondaryFileToDelete,
                                        repositories
                                    ).flatMap(() => {
                                        return removeAsyncDeletionsFromDatastore(
                                            [secondaryFileToDelete.id],
                                            repositories.glassUploadsRepository
                                        ).flatMap(() => {
                                            console.debug(
                                                `SUCCESS - Deleted async-deletions id from Datastore ${secondaryFileToDelete.id}`
                                            );
                                            return Future.success(undefined);
                                        });
                                    });
                                } else {
                                    return Future.error(
                                        `An error occured while deleting the data exiting. Secondary file: ${secondaryFileToDelete?.fileName}`
                                    );
                                }
                            });
                        } else {
                            return deleteUploadAndDocumentFromDatasoreAndDHIS2(
                                secondaryFileToDelete,
                                repositories
                            ).flatMap(() => {
                                return removeAsyncDeletionsFromDatastore(
                                    [secondaryFileToDelete.id],
                                    repositories.glassUploadsRepository
                                ).flatMap(() => {
                                    console.debug(
                                        `SUCCESS - Deleted async-deletions id from Datastore ${secondaryFileToDelete.id}`
                                    );
                                    return Future.success(undefined);
                                });
                            });
                        }
                    } else {
                        return Future.error(
                            `An error occured while deleting file, file not found. Upload selected to delete: ${uploadToDelete.id}`
                        );
                    }
                });
            });
        })
    ).toVoid();
}

main();

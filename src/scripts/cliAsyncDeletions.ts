import { command, run } from "cmd-ts";
import "dotenv/config";

import { getInstance, warmUpSession } from "./common";
import { getD2APiFromInstance } from "../utils/d2-api";
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { Id } from "../domain/entities/Ref";
import { GetAsyncDeletionsUseCase } from "../domain/usecases/GetAsyncDeletionsUseCase";
import { GlassUploadsRepository } from "../domain/repositories/GlassUploadsRepository";
import { GlassUploadsProgramRepository } from "../data/repositories/GlassUploadsProgramRepository";
import { GetGlassUploadsByIdsUseCase } from "../domain/usecases/GetGlassUploadsByIdsUseCase";
import { Future, FutureData } from "../domain/entities/Future";
import { GlassModule, GlassModuleName, isGlassModuleName } from "../domain/entities/GlassModule";
import { GlassModuleRepository } from "../domain/repositories/GlassModuleRepository";
import { GlassUploads } from "../domain/entities/GlassUploads";
import { GlassModuleDefaultRepository } from "../data/repositories/GlassModuleDefaultRepository";
import { ModuleDetails, moduleProperties } from "../domain/utils/ModuleProperties";
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
import { RemoveAsyncDeletionByIdUseCase } from "../domain/usecases/RemoveAsyncDeletionByIdUseCase";
import { SendNotificationsUseCase } from "../domain/usecases/SendNotificationsUseCase";
import { NotificationRepository } from "../domain/repositories/NotificationRepository";
import { UsersRepository } from "../domain/repositories/UsersRepository";
import { DeletePrimaryFileDataUseCase } from "../domain/usecases/data-entry/DeletePrimaryFileDataUseCase";
import { DeleteSecondaryFileDataUseCase } from "../domain/usecases/data-entry/DeleteSecondaryFileDataUseCase";
import { DownloadDocumentAsArrayBufferUseCase } from "../domain/usecases/DownloadDocumentAsArrayBufferUseCase";
import { GlassAsyncDeletionsDefaultRepository } from "../data/repositories/GlassAsyncDeletionsDefaultRepository";
import { GlassAsyncDeletionsRepository } from "../domain/repositories/GlassAsyncDeletionsRepository";
import { GlassAsyncDeletion, GlassAsyncDeletionStatus } from "../domain/entities/GlassAsyncDeletions";
import { GeneralInfoDefaultRepository } from "../data/repositories/GeneralInfoDefaultRepository";
import { GeneralInfoRepository } from "../domain/repositories/GeneralInfoRepository";
import { GlassGeneralInfo } from "../domain/entities/GlassGeneralInfo";
import { GetGeneralInformationUseCase } from "../domain/usecases/GetGeneralInformationUseCase";
import { SetMultipleUploadErrorAsyncDeletingUseCase } from "../domain/usecases/SetMultipleUploadErrorAsyncDeletingUseCase";
import { IncrementAsyncDeletionAttemptsAndResetStatusUseCase } from "../domain/usecases/IncrementAsyncDeletionAttemptsAndResetStatusUseCase";
import { SetAsyncDeletionsStatusUseCase } from "../domain/usecases/SetAsyncDeletionsStatusUseCase";
import { GetAsyncDeletionByIdUseCase } from "../domain/usecases/GetAsyncDeletionByIdUseCase";
import { RemoveAsyncDeletionsUseCase } from "../domain/usecases/RemoveAsyncDeletionsUseCase";
import consoleLogger from "../utils/consoleLogger";
import { GetGlassUploadsByCorrespondingRisUploadIdUseCase } from "../domain/usecases/GetGlassUploadsByCorrespondingRisUploadIdUseCase";
import { GetGlassUploadByIdUseCase } from "../domain/usecases/GetGlassUploadByIdUseCase";
import { getUploadsFormDataBuilder } from "../utils/getUploadsFormDataBuilder";

const UPLOADED_FILE_STATUS_LOWERCASE = "uploaded";
const IMPORT_SUMMARY_STATUS_ERROR = "ERROR";
const DEFAULT_MAX_ATTEMPS_FOR_ASYNC_DELETIONS = 3;

// Any upload stuck in DELETING for longer than this is treated as a zombie left by a crashed run.
// Genuine in-progress deletions are expected to complete well within this window.
const DELETING_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 hours

function findZombieUploadIds(asyncDeletions: GlassAsyncDeletion[]): Id[] {
    const now = Date.now();
    return asyncDeletions
        .filter(upload => {
            if (upload.status !== "DELETING") return false;
            if (!upload.deletingStartedAt) return true; // legacy record with no timestamp → treat as zombie
            return now - new Date(upload.deletingStartedAt).getTime() > DELETING_TIMEOUT_MS;
        })
        .map(upload => upload.uploadId);
}

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

                const token =
                    process.env.REACT_APP_DHIS2_TOKEN_PROD || process.env.REACT_APP_DHIS2_TOKEN;

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

                const instance = getInstance(envVars);
                const api = getD2APiFromInstance(instance);
                await warmUpSession(api);
                const dataStoreClient = new DataStoreClient(instance);
                const runtime: "node" | "browser" = typeof window === "undefined" ? "node" : "browser";
                const uploadsFormDataBuilder = getUploadsFormDataBuilder(runtime);

                const instanceRepository = new InstanceDefaultRepository(instance, dataStoreClient);
                const glassModuleRepository = new GlassModuleDefaultRepository(dataStoreClient);
                const glassUploadsRepository = new GlassUploadsProgramRepository(api, uploadsFormDataBuilder);
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
                const glassAsyncDeletionsRepository = new GlassAsyncDeletionsDefaultRepository(dataStoreClient);
                const glassGeneralInfoRepository = new GeneralInfoDefaultRepository(dataStoreClient, instance);

                consoleLogger.debug(`Running asynchronous deletion for URL ${envVars.url}`);
                return getMaxAttemptsForAsyncDeletionsFromDatastore(glassGeneralInfoRepository)
                    .flatMap(generalInfo => {
                        const maxAttemptsForAsyncDeletions =
                            generalInfo?.maxAttemptsForAsyncDeletions ?? DEFAULT_MAX_ATTEMPS_FOR_ASYNC_DELETIONS;

                        return getAsyncDeletionsFromDatastore(glassAsyncDeletionsRepository).flatMap(
                            asyncUploadsToDelete => {
                                if (!asyncUploadsToDelete || asyncUploadsToDelete.length === 0) {
                                    consoleLogger.debug(`There is nothing marked for deletion`);
                                    return Future.success(undefined);
                                }

                                // Separate genuinely in-progress deletions from zombies left by a crashed run.
                                // A DELETING upload with no timestamp or one older than DELETING_TIMEOUT_MS
                                // is considered a zombie and will be reset to PENDING so it can be retried.
                                const zombieUploadIds = findZombieUploadIds(asyncUploadsToDelete);
                                const genuinelyDeletingCount = asyncUploadsToDelete.filter(
                                    u => u.status === "DELETING" && !zombieUploadIds.includes(u.uploadId)
                                ).length;

                                if (genuinelyDeletingCount > 0) {
                                    consoleLogger.debug(
                                        `Skipping ${genuinelyDeletingCount} uploads currently being deleted (started within the last ${DELETING_TIMEOUT_MS / 3600000}h)`
                                    );
                                }
                                if (zombieUploadIds.length > 0) {
                                    consoleLogger.debug(
                                        `Resetting ${zombieUploadIds.length} uploads stuck in DELETING status back to PENDING for retry`
                                    );
                                }

                                // Update local state so the rest of the logic sees zombies as PENDING
                                const normalizedUploads: GlassAsyncDeletion[] = asyncUploadsToDelete.map(upload =>
                                    zombieUploadIds.includes(upload.uploadId)
                                        ? { ...upload, status: "PENDING" as GlassAsyncDeletionStatus }
                                        : upload
                                );

                                const resetZombiesFuture: FutureData<void> =
                                    zombieUploadIds.length > 0
                                        ? setAsyncDeletionsStatus(
                                              glassAsyncDeletionsRepository,
                                              zombieUploadIds,
                                              "PENDING"
                                          )
                                        : Future.success(undefined);

                                return resetZombiesFuture.flatMap(() => {
                                    const uploadIdsToSetAsyncDeletionErrorStatus = normalizedUploads
                                        .filter(upload => upload.attempts >= maxAttemptsForAsyncDeletions)
                                        .map(upload => upload.uploadId);

                                    const uploadsToContinueAsyncDeletion = normalizedUploads.filter(
                                        upload =>
                                            upload.attempts < maxAttemptsForAsyncDeletions &&
                                            upload.status === "PENDING"
                                    );

                                    consoleLogger.debug(
                                        `There are ${uploadsToContinueAsyncDeletion.length} uploads pending deletion and another ${uploadIdsToSetAsyncDeletionErrorStatus.length} have reached the maximum number of attempts and will be marked as error`
                                    );

                                    return deleteFromDatastoreAndSetDeletionErrorStatusToUploads(
                                        glassUploadsRepository,
                                        glassAsyncDeletionsRepository,
                                        uploadIdsToSetAsyncDeletionErrorStatus
                                    ).flatMap(() => {
                                        const uploadsIdsToContinueAsyncDeletion = uploadsToContinueAsyncDeletion.map(
                                            ({ uploadId }) => uploadId
                                        );

                                        if (uploadsIdsToContinueAsyncDeletion.length === 0) {
                                            consoleLogger.debug(`END - No uploads to continue async deletion.`);
                                            return Future.success(undefined);
                                        }

                                        return Future.joinObj({
                                            glassModules: getGlassModulesFromDatastore(glassModuleRepository),
                                            glassUploadsToDelete: getGlassUploadsByIdsUseCase(
                                                uploadsIdsToContinueAsyncDeletion,
                                                glassUploadsRepository
                                            ),
                                        }).flatMap(({ glassModules, glassUploadsToDelete }) => {
                                            // Some IDs in the queue may no longer exist as events in DHIS2
                                            // (already deleted externally, or orphaned after a partial run).
                                            // Remove them from the queue so they don't block future runs.
                                            const foundIds = new Set(glassUploadsToDelete.map(u => u.id));
                                            const missingIds = uploadsIdsToContinueAsyncDeletion.filter(
                                                id => !foundIds.has(id)
                                            );

                                            if (missingIds.length > 0) {
                                                consoleLogger.debug(
                                                    `${missingIds.length} upload(s) no longer exist in DHIS2, removing from async deletion queue: ${missingIds.join(", ")}`
                                                );
                                            }

                                            const cleanupMissingFuture: FutureData<void> =
                                                missingIds.length > 0
                                                    ? removeAsyncDeletionsFromDatastore(
                                                          missingIds,
                                                          glassAsyncDeletionsRepository
                                                      )
                                                    : Future.success(undefined);

                                            return cleanupMissingFuture.flatMap(() => {
                                            const uploadsToDelete: GlassUploadsWithModuleNameAndAttemps[] =
                                                glassUploadsToDelete.map(upload => {
                                                    const moduleName = glassModules.find(
                                                        module => module.id === upload.module
                                                    )?.name;

                                                    const attempts =
                                                        uploadsToContinueAsyncDeletion.find(
                                                            uploadAsyncDeletions =>
                                                                uploadAsyncDeletions.uploadId === upload.id
                                                        )?.attempts || 0;

                                                    if (!isGlassModuleName(moduleName)) {
                                                        consoleLogger.error(
                                                            `Module name not found for upload ${upload.id}`
                                                        );
                                                        throw new Error(
                                                            `Module name not found for upload ${upload.id}`
                                                        );
                                                    }

                                                    return {
                                                        ...upload,
                                                        moduleName: moduleName,
                                                        attempts: attempts,
                                                    };
                                                });

                                            if (uploadsToDelete.length === 0) {
                                                consoleLogger.debug(`END - No remaining uploads to delete.`);
                                                return Future.success(undefined);
                                            }

                                            return deleteUploadedDatasets(
                                                uploadsToDelete,
                                                maxAttemptsForAsyncDeletions,
                                                glassModules,
                                                {
                                                    sampleDataRepository,
                                                    metadataRepository,
                                                    dataValuesRepository,
                                                    excelRepository,
                                                    instanceRepository,
                                                    glassDocumentsRepository,
                                                    glassUploadsRepository,
                                                    dhis2EventsDefaultRepository,
                                                    programRulesMetadataRepository:
                                                        programRulesMetadataDefaultRepository,
                                                    glassAtcRepository,
                                                    risDataRepository,
                                                    risIndividualFungalRepository,
                                                    trackerRepository,
                                                    glassModuleRepository,
                                                    atcRepository,
                                                    amcProductRepository: amcProductDataRepository,
                                                    amcSubstanceDataRepository,
                                                    glassAsyncDeletionsRepository,
                                                }
                                            );
                                            }); // cleanupMissingFuture.flatMap
                                        });
                                    });
                                });
                            }
                        );
                    })
                    .run(
                        () =>
                            consoleLogger.debug(
                                `SUCCESS - Deleted all uploaded datasets marked for deletion with status PENDING.`
                            ),
                        error => consoleLogger.error(`ERROR - ${error}.`)
                    );
            } catch (e) {
                consoleLogger.error(`Async deletions have stopped with error: ${e}. Please, restart again.`);
                process.exit(1);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

type GlassUploadsWithModuleNameAndAttemps = GlassUploads & { moduleName: GlassModuleName; attempts: number };

function getMaxAttemptsForAsyncDeletionsFromDatastore(
    glassGeneralInfoRepository: GeneralInfoRepository
): FutureData<GlassGeneralInfo> {
    return new GetGeneralInformationUseCase(glassGeneralInfoRepository).execute();
}

function deleteFromDatastoreAndSetDeletionErrorStatusToUploads(
    glassUploadsRepository: GlassUploadsRepository,
    glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository,
    uploadIdsToSetAsyncDeletionErrorStatus: Id[]
): FutureData<void> {
    if (uploadIdsToSetAsyncDeletionErrorStatus.length === 0) {
        return Future.success(undefined);
    } else {
        consoleLogger.debug(
            `Setting errorAsyncDeleting to uploads ${uploadIdsToSetAsyncDeletionErrorStatus.join(
                ", "
            )} and removing from async-deletions in Datastore`
        );
        return removeAsyncDeletionsFromDatastore(
            uploadIdsToSetAsyncDeletionErrorStatus,
            glassAsyncDeletionsRepository
        ).flatMap(() => {
            return new SetMultipleUploadErrorAsyncDeletingUseCase(glassUploadsRepository)
                .execute(uploadIdsToSetAsyncDeletionErrorStatus)
                .flatMap(() => {
                    return Future.success(undefined);
                });
        });
    }
}

function getAsyncDeletionsFromDatastore(
    glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository
): FutureData<GlassAsyncDeletion[]> {
    return new GetAsyncDeletionsUseCase(glassAsyncDeletionsRepository).execute();
}

function removeAsyncDeletionByIdFromDatastore(
    uploadIdToRemove: Id,
    glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository
): FutureData<void> {
    return new RemoveAsyncDeletionByIdUseCase(glassAsyncDeletionsRepository).execute(uploadIdToRemove);
}

function removeAsyncDeletionsFromDatastore(
    uploadIdsToRemove: Id[],
    glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository
): FutureData<void> {
    return new RemoveAsyncDeletionsUseCase(glassAsyncDeletionsRepository).execute(uploadIdsToRemove);
}

function setAsyncDeletionsStatus(
    glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository,
    uploadIds: Id[],
    status: GlassAsyncDeletionStatus
): FutureData<void> {
    return new SetAsyncDeletionsStatusUseCase(glassAsyncDeletionsRepository).execute(uploadIds, status);
}

function incrementAsyncDeletionOrDeleteIfMaxAttemptAndSetErrorStatus(
    glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository,
    glassUploadsRepository: GlassUploadsRepository,
    upload: GlassUploadsWithModuleNameAndAttemps,
    maxAttemptsForAsyncDeletions: number
): FutureData<void> {
    const nextAttempt = upload.attempts + 1;
    if (nextAttempt >= maxAttemptsForAsyncDeletions) {
        return removeAsyncDeletionByIdFromDatastore(upload.id, glassAsyncDeletionsRepository).flatMap(() => {
            return new SetMultipleUploadErrorAsyncDeletingUseCase(glassUploadsRepository).execute([upload.id]);
        });
    } else {
        return new IncrementAsyncDeletionAttemptsAndResetStatusUseCase(glassAsyncDeletionsRepository).execute(
            upload.id
        );
    }
}

function isPendingDeletion(
    glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository,
    uploadId: Id
): FutureData<boolean> {
    return new GetAsyncDeletionByIdUseCase(glassAsyncDeletionsRepository).execute(uploadId).flatMap(upload => {
        return Future.success(upload?.status === "PENDING");
    });
}

// TODO: send notification to users
/*function _sendNotification(
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
}*/

function getGlassModulesFromDatastore(glassModuleRepository: GlassModuleRepository): FutureData<GlassModule[]> {
    return glassModuleRepository.getAll();
}

function getGlassUploadsByIdsUseCase(
    uploadIds: Id[],
    glassUploadsRepository: GlassUploadsRepository
): FutureData<GlassUploads[]> {
    return new GetGlassUploadsByIdsUseCase(glassUploadsRepository).execute(uploadIds);
}

function getGlassUploadByIdUseCase(
    uploadId: Id,
    glassUploadsRepository: GlassUploadsRepository
): FutureData<GlassUploads> {
    return new GetGlassUploadByIdUseCase(glassUploadsRepository).execute(uploadId);
}

function getGlassUploadByCorrespondingRisUploadId(
    correspondingRisUploadId: Id,
    glassUploadsRepository: GlassUploadsRepository
): FutureData<GlassUploads> {
    return new GetGlassUploadsByCorrespondingRisUploadIdUseCase(glassUploadsRepository).execute(
        correspondingRisUploadId
    );
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
            consoleLogger.debug(`Upload and document ${upload.fileName} deleted in Datastore and from DHIS2 documents`);
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
    consoleLogger.debug(`Deleting data from primary file ${upload.id}`);
    return new DeletePrimaryFileDataUseCase(repositories).execute(currentModule, upload, arrayBuffer, true);
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
    consoleLogger.debug(`Deleting data from secondary file ${upload.id}`);
    return new DeleteSecondaryFileDataUseCase(repositories).execute(currentModule, upload, arrayBuffer, true);
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

function getPrimaryAndSecondaryUploadsToDelete(
    rowToDelete: GlassUploadsWithModuleNameAndAttemps,
    moduleProperties: Map<string, ModuleDetails>,
    currentModuleName: GlassModuleName,
    glassUploadsRepository: GlassUploadsRepository
): FutureData<{ primaryUploadToDelete: GlassUploads | undefined; secondaryUploadToDelete: GlassUploads | undefined }> {
    const module = moduleProperties.get(currentModuleName);

    if (!module) {
        return Future.error(`Module "${currentModuleName}" is not defined in moduleProperties`);
    }

    const { isSecondaryFileApplicable, isSecondaryRelated, primaryFileType } = module;

    const fileTypeLower = rowToDelete.fileType.toLowerCase();
    const primaryFileTypeLower = primaryFileType.toLowerCase();
    const isPrimaryFile = fileTypeLower === primaryFileTypeLower;

    // Case 1: Secondary file applicable and related (AMR: RIS + Sample)
    if (isSecondaryFileApplicable && isSecondaryRelated) {
        type UploadPair = { primaryUploadToDelete: GlassUploads | undefined; secondaryUploadToDelete: GlassUploads | undefined };
        if (isPrimaryFile) {
            return getGlassUploadByCorrespondingRisUploadId(rowToDelete.id, glassUploadsRepository)
                .flatMap(secondaryUploadToDelete =>
                    Future.success<UploadPair, string>({ primaryUploadToDelete: rowToDelete, secondaryUploadToDelete })
                )
                .flatMapError(_error => {
                    consoleLogger.debug(
                        `Secondary upload for primary ${rowToDelete.id} not found in DHIS2, proceeding with primary-only deletion`
                    );
                    return Future.success<UploadPair, string>({ primaryUploadToDelete: rowToDelete, secondaryUploadToDelete: undefined });
                });
        } else {
            return getGlassUploadByIdUseCase(rowToDelete.correspondingRisUploadId, glassUploadsRepository)
                .flatMap(primaryUploadToDelete =>
                    Future.success<UploadPair, string>({ primaryUploadToDelete, secondaryUploadToDelete: rowToDelete })
                )
                .flatMapError(_error => {
                    consoleLogger.debug(
                        `Primary upload ${rowToDelete.correspondingRisUploadId} not found in DHIS2, proceeding with secondary-only deletion`
                    );
                    return Future.success<UploadPair, string>({ primaryUploadToDelete: undefined, secondaryUploadToDelete: rowToDelete });
                });
        }
    }

    // Case 2: Secondary file NOT related
    if (!isSecondaryRelated) {
        return isPrimaryFile
            ? Future.success({
                  primaryUploadToDelete: rowToDelete,
                  secondaryUploadToDelete: undefined,
              })
            : Future.success({
                  primaryUploadToDelete: undefined,
                  secondaryUploadToDelete: rowToDelete,
              });
    }

    // Case 3: Secondary file not applicable
    return Future.success({
        primaryUploadToDelete: rowToDelete,
        secondaryUploadToDelete: undefined,
    });
}

// Deleting a uploaded dataset completely has the following steps:
// 0. Check if the upload is pending deletion and set status to "DELETING"
// 1. Delete corresponsding datasetValue/event for each row in the file if the file has status different than "uploaded"
// 2. Delete corresponding 'upload' and 'document' from Datastore, and delete corresponding document from DHIS2
// 3. If some error occurs while deleting the data, increment the attempts and set errorAsyncDeleting in upload if max attempts reached
// 4. Remove the async-deletion from Datastore
function deleteUploadedDatasets(
    uploadsToDelete: GlassUploadsWithModuleNameAndAttemps[],
    maxAttemptsForAsyncDeletions: number,
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
        glassAsyncDeletionsRepository: GlassAsyncDeletionsRepository;
    }
): FutureData<void> {
    return Future.sequential(
        uploadsToDelete.map(uploadToDelete => {
            return Future.fromPromise(new Promise(resolve => setTimeout(resolve, 500))).flatMap(() => {
                return isPendingDeletion(repositories.glassAsyncDeletionsRepository, uploadToDelete.id).flatMap(
                    isPending => {
                        if (!isPending) {
                            consoleLogger.debug(`Upload ${uploadToDelete.id} is not pending deletion`);
                            return Future.success(undefined);
                        } else {
                            consoleLogger.debug(
                                `Deleting upload ${uploadToDelete.id} from module ${uploadToDelete.moduleName}, org unit ${uploadToDelete.orgUnit} and period ${uploadToDelete.period}`
                            );
                            return setAsyncDeletionsStatus(
                                repositories.glassAsyncDeletionsRepository,
                                [uploadToDelete.id],
                                "DELETING"
                            ).flatMap(() => {
                                return getPrimaryAndSecondaryUploadsToDelete(
                                    uploadToDelete,
                                    moduleProperties,
                                    uploadToDelete.moduleName,
                                    repositories.glassUploadsRepository
                                ).flatMap(({ primaryUploadToDelete, secondaryUploadToDelete }) => {
                                    const currentModule = glassModules.find(
                                        module => module.name === uploadToDelete.moduleName
                                    );
                                    if (!currentModule) {
                                        consoleLogger.error(`Module ${uploadToDelete.moduleName} not found`);
                                        return incrementAsyncDeletionOrDeleteIfMaxAttemptAndSetErrorStatus(
                                            repositories.glassAsyncDeletionsRepository,
                                            repositories.glassUploadsRepository,
                                            uploadToDelete,
                                            maxAttemptsForAsyncDeletions
                                        );
                                    }

                                    consoleLogger.debug(
                                        `Downloading files to delete: ${primaryUploadToDelete?.fileId}, ${secondaryUploadToDelete?.fileId}`
                                    );

                                    return Future.joinObj({
                                        primaryArrayBuffer: primaryUploadToDelete
                                            ? getArrayBufferOfFile(primaryUploadToDelete.fileId, repositories)
                                            : Future.success(undefined),
                                        secondaryArrayBuffer: secondaryUploadToDelete
                                            ? getArrayBufferOfFile(secondaryUploadToDelete.fileId, repositories)
                                            : Future.success(undefined),
                                    }).flatMap(({ primaryArrayBuffer, secondaryArrayBuffer }) => {
                                        if (primaryUploadToDelete && primaryArrayBuffer) {
                                            return deleteDatasetValuesOrEvents(
                                                primaryUploadToDelete,
                                                secondaryUploadToDelete,
                                                primaryArrayBuffer,
                                                secondaryArrayBuffer,
                                                currentModule,
                                                repositories
                                            ).flatMap(({ deletePrimaryFileSummary, deleteSecondaryFileSummary }) => {
                                                if (deletePrimaryFileSummary) {
                                                    consoleLogger.debug(
                                                        `Delete data from primary file summary: ${JSON.stringify(
                                                            deletePrimaryFileSummary
                                                        )}`
                                                    );
                                                }

                                                if (deleteSecondaryFileSummary) {
                                                    consoleLogger.debug(
                                                        `Delete data from secondary file summary: ${JSON.stringify(
                                                            deleteSecondaryFileSummary
                                                        )}`
                                                    );
                                                }

                                                if (
                                                    deletePrimaryFileSummary?.status === IMPORT_SUMMARY_STATUS_ERROR ||
                                                    deleteSecondaryFileSummary?.status === IMPORT_SUMMARY_STATUS_ERROR
                                                ) {
                                                    consoleLogger.error(
                                                        `An error occured while deleting the data. Primary file: ${primaryUploadToDelete.fileName}, secondary file: ${secondaryUploadToDelete?.fileName}`
                                                    );
                                                    return incrementAsyncDeletionOrDeleteIfMaxAttemptAndSetErrorStatus(
                                                        repositories.glassAsyncDeletionsRepository,
                                                        repositories.glassUploadsRepository,
                                                        uploadToDelete,
                                                        maxAttemptsForAsyncDeletions
                                                    );
                                                }

                                                if (deletePrimaryFileSummary) {
                                                    consoleLogger.debug(
                                                        `Data from primary file ${primaryUploadToDelete.fileName} deleted`
                                                    );
                                                }

                                                if (secondaryUploadToDelete && deleteSecondaryFileSummary) {
                                                    consoleLogger.debug(
                                                        `Data from secondary file ${secondaryUploadToDelete.fileName} deleted`
                                                    );
                                                }

                                                return deleteUploadAndDocumentFromDatasoreAndDHIS2(
                                                    primaryUploadToDelete,
                                                    repositories
                                                ).flatMap(() => {
                                                    if (secondaryUploadToDelete) {
                                                        return deleteUploadAndDocumentFromDatasoreAndDHIS2(
                                                            secondaryUploadToDelete,
                                                            repositories
                                                        ).flatMap(() => {
                                                            return removeAsyncDeletionByIdFromDatastore(
                                                                primaryUploadToDelete.id,
                                                                repositories.glassAsyncDeletionsRepository
                                                            ).flatMap(() => {
                                                                consoleLogger.debug(
                                                                    `SUCCESS - Deleted async-deletions id from Datastore ${uploadToDelete.id}`
                                                                );
                                                                return Future.success(undefined);
                                                            });
                                                        });
                                                    } else {
                                                        return removeAsyncDeletionByIdFromDatastore(
                                                            primaryUploadToDelete.id,
                                                            repositories.glassAsyncDeletionsRepository
                                                        ).flatMap(() => {
                                                            consoleLogger.debug(
                                                                `SUCCESS - Deleted async-deletions id from Datastore ${uploadToDelete.id}`
                                                            );
                                                            return Future.success(undefined);
                                                        });
                                                    }
                                                });
                                            });
                                        } else if (secondaryUploadToDelete && secondaryArrayBuffer) {
                                            if (
                                                secondaryUploadToDelete.status.toLowerCase() !==
                                                UPLOADED_FILE_STATUS_LOWERCASE
                                            ) {
                                                consoleLogger.debug(`Delete only secondary uploaded dataset`);
                                                return deleteDatasetValuesOrEventsFromSecondaryUploaded(
                                                    currentModule,
                                                    secondaryUploadToDelete,
                                                    secondaryArrayBuffer,
                                                    repositories
                                                ).flatMap(deleteSecondaryFileSummary => {
                                                    if (deleteSecondaryFileSummary) {
                                                        consoleLogger.debug(
                                                            `Delete data from secondary file summary: ${JSON.stringify(
                                                                deleteSecondaryFileSummary
                                                            )}`
                                                        );
                                                    }
                                                    if (
                                                        deleteSecondaryFileSummary &&
                                                        deleteSecondaryFileSummary.status !==
                                                            IMPORT_SUMMARY_STATUS_ERROR
                                                    ) {
                                                        consoleLogger.debug(
                                                            `Data from secondary file ${secondaryUploadToDelete.fileName} deleted`
                                                        );
                                                        return deleteUploadAndDocumentFromDatasoreAndDHIS2(
                                                            secondaryUploadToDelete,
                                                            repositories
                                                        ).flatMap(() => {
                                                            return removeAsyncDeletionByIdFromDatastore(
                                                                secondaryUploadToDelete.id,
                                                                repositories.glassAsyncDeletionsRepository
                                                            ).flatMap(() => {
                                                                consoleLogger.debug(
                                                                    `SUCCESS - Deleted async-deletions id from Datastore ${uploadToDelete.id}`
                                                                );
                                                                return Future.success(undefined);
                                                            });
                                                        });
                                                    } else {
                                                        consoleLogger.error(
                                                            `An error occured while deleting the data. Secondary file: ${secondaryUploadToDelete?.fileName}`
                                                        );
                                                        return incrementAsyncDeletionOrDeleteIfMaxAttemptAndSetErrorStatus(
                                                            repositories.glassAsyncDeletionsRepository,
                                                            repositories.glassUploadsRepository,
                                                            uploadToDelete,
                                                            maxAttemptsForAsyncDeletions
                                                        );
                                                    }
                                                });
                                            } else {
                                                return deleteUploadAndDocumentFromDatasoreAndDHIS2(
                                                    secondaryUploadToDelete,
                                                    repositories
                                                ).flatMap(() => {
                                                    return removeAsyncDeletionByIdFromDatastore(
                                                        secondaryUploadToDelete.id,
                                                        repositories.glassAsyncDeletionsRepository
                                                    ).flatMap(() => {
                                                        consoleLogger.debug(
                                                            `SUCCESS - Deleted async-deletions id from Datastore ${uploadToDelete.id}`
                                                        );
                                                        return Future.success(undefined);
                                                    });
                                                });
                                            }
                                        } else {
                                            consoleLogger.error(
                                                `An error occured while deleting file, file not found. Upload selected to delete: ${uploadToDelete.id}`
                                            );
                                            return incrementAsyncDeletionOrDeleteIfMaxAttemptAndSetErrorStatus(
                                                repositories.glassAsyncDeletionsRepository,
                                                repositories.glassUploadsRepository,
                                                uploadToDelete,
                                                maxAttemptsForAsyncDeletions
                                            );
                                        }
                                    });
                                });
                            })
                            .flatMapError(error => {
                                // Safety net: catches any error that escaped the explicit handlers above
                                // after DELETING status was already set. Resets to PENDING for retry
                                // (or marks as error if max attempts reached) so the upload never stays
                                // permanently stuck in DELETING.
                                consoleLogger.error(
                                    `Unexpected error during deletion of upload ${uploadToDelete.id}, resetting for retry: ${error}`
                                );
                                return incrementAsyncDeletionOrDeleteIfMaxAttemptAndSetErrorStatus(
                                    repositories.glassAsyncDeletionsRepository,
                                    repositories.glassUploadsRepository,
                                    uploadToDelete,
                                    maxAttemptsForAsyncDeletions
                                );
                            });
                        }
                    }
                );
            });
        })
    ).toVoid();
}

main();

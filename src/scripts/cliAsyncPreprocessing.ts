import { command, run } from "cmd-ts";
import "dotenv/config";

import { getD2ApiFromArgs, getInstance } from "./common";
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { Future, FutureData } from "../domain/entities/Future";
import consoleLogger from "../utils/consoleLogger";
import {
    AsyncPreprocessing,
    AsyncPreprocessingStatus,
    DEFAULT_MAX_ATTEMPS_FOR_ASYNC_PREPROCESSING,
} from "../domain/entities/AsyncPreprocessing";
import { GeneralInfoDefaultRepository } from "../data/repositories/GeneralInfoDefaultRepository";
import { AsyncPreprocessingDefaultRepository } from "../data/repositories/AsyncPreprocessingDefaultRepository";
import { GlassUploadsDefaultRepository } from "../data/repositories/GlassUploadsDefaultRepository";
import { GlassModuleDefaultRepository } from "../data/repositories/GlassModuleDefaultRepository";
import { GeneralInfoRepository } from "../domain/repositories/GeneralInfoRepository";
import { GlassGeneralInfo } from "../domain/entities/GlassGeneralInfo";
import { GetGeneralInformationUseCase } from "../domain/usecases/GetGeneralInformationUseCase";
import { AsyncPreprocessingRepository } from "../domain/repositories/AsyncPreprocessingRepository";
import { GetAsyncPreprocessingUseCase } from "../domain/usecases/GetAsyncPreprocessingUseCase";
import { Id } from "../domain/entities/Base";
import { GlassUploadsRepository } from "../domain/repositories/GlassUploadsRepository";
import { RemoveAsyncPreprocessingUseCase } from "../domain/usecases/RemoveAsyncPreprocessingUseCase";
import { SetMultipleErrorAsyncPreprocessingUseCase } from "../domain/usecases/SetMultipleErrorAsyncPreprocessingUseCase";
import { GlassDocumentsDefaultRepository } from "../data/repositories/GlassDocumentsDefaultRepository";
import { GlassDocumentsRepository } from "../domain/repositories/GlassDocumentsRepository";
import { DeleteDocumentsByUploadIdUseCase } from "../domain/usecases/DeleteDocumentsByUploadIdUseCase";
import { GetGlassUploadByIdUseCase } from "../domain/usecases/GetGlassUploadByIdUseCase";
import { GlassUploads } from "../domain/entities/GlassUploads";
import { DownloadDocumentUseCase } from "../domain/usecases/DownloadDocumentUseCase";
import { SetAsyncPreprocessingStatusUseCase } from "../domain/usecases/SetAsyncPreprocessingStatusUseCase";
import { GlassModuleRepository } from "../domain/repositories/GlassModuleRepository";
import { GlassModule } from "../domain/entities/GlassModule";
import { CountryDefaultRepository } from "../data/repositories/CountryDefaultRepository";
import { RISIndividualFungalDataCSVDefaultRepository } from "../data/repositories/data-entry/RISIndividualFungalDataCSVDefaultRepository";
import { SampleDataCSVDeafultRepository } from "../data/repositories/data-entry/SampleDataCSVDeafultRepository";
import { TrackerDefaultRepository } from "../data/repositories/TrackerDefaultRepository";
import { ProgramRulesMetadataDefaultRepository } from "../data/repositories/program-rule/ProgramRulesMetadataDefaultRepository";
import { MetadataDefaultRepository } from "../data/repositories/MetadataDefaultRepository";
import { DataValuesDefaultRepository } from "../data/repositories/data-entry/DataValuesDefaultRepository";
import { RISIndividualFungalDataRepository } from "../domain/repositories/data-entry/RISIndividualFungalDataRepository";
import { SetAsyncUploadsUseCase } from "../domain/usecases/SetAsyncUploadsUseCase";
import { GlassAsyncUploadsRepository } from "../domain/repositories/GlassAsyncUploadsRepository";
import { GlassAsyncUploadsDefaultRepository } from "../data/repositories/GlassAsyncUploadsDefaultRepository";
import { SetUploadStatusUseCase } from "../domain/usecases/SetUploadStatusUseCase";

async function main() {
    const cmd = command({
        name: "Async preprocessing of files for Datasets",
        description:
            "This script takes the upload from async-preprocessing in Datastore and validates the file saving results in uploads in Datastore.",
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

                const glassGeneralInfoRepository = new GeneralInfoDefaultRepository(dataStoreClient, instance);
                const asyncPreprocessingRepository = new AsyncPreprocessingDefaultRepository(dataStoreClient);
                const glassUploadsRepository = new GlassUploadsDefaultRepository(dataStoreClient);
                const glassModuleRepository = new GlassModuleDefaultRepository(dataStoreClient);
                const countryRepository = new CountryDefaultRepository(api);
                const glassDocumentsRepository = new GlassDocumentsDefaultRepository(dataStoreClient, instance);
                const risIndividualFungalRepository = new RISIndividualFungalDataCSVDefaultRepository();
                const sampleDataRepository = new SampleDataCSVDeafultRepository();
                const trackerRepository = new TrackerDefaultRepository(instance);
                const programRulesMetadataRepository = new ProgramRulesMetadataDefaultRepository(instance);
                const metadataRepository = new MetadataDefaultRepository(instance);
                const dataValuesRepository = new DataValuesDefaultRepository(instance);
                const glassAsyncUploadsRepository = new GlassAsyncUploadsDefaultRepository(dataStoreClient);

                consoleLogger.debug(`Running asynchronous preprocessing for URL ${envVars.url}`);
                return getMaxAttemptsFromDatastore(glassGeneralInfoRepository).run(
                    generalInfo => {
                        const maxAttempts =
                            generalInfo?.maxAttemptsForAsyncPreprocessing ??
                            DEFAULT_MAX_ATTEMPS_FOR_ASYNC_PREPROCESSING;

                        return getAsyncPreprocessingFromDatastore(asyncPreprocessingRepository).run(
                            asyncPreprocessingArray => {
                                if (asyncPreprocessingArray && asyncPreprocessingArray.length > 0) {
                                    const uploadIdsToSetError: Id[] = asyncPreprocessingArray
                                        .filter(preprocessingUpload => preprocessingUpload.attempts >= maxAttempts)
                                        .map(preprocessingUpload => preprocessingUpload.uploadId);

                                    const uploadsToContinuePreprocessing = asyncPreprocessingArray.filter(
                                        preprocessingUpload => preprocessingUpload.attempts < maxAttempts
                                    );

                                    const pendingToPreprocess = uploadsToContinuePreprocessing.filter(
                                        preprocessingUpload => preprocessingUpload.status === "PENDING"
                                    );
                                    const processing = uploadsToContinuePreprocessing.filter(
                                        preprocessingUpload => preprocessingUpload.status === "PREPROCESSING"
                                    );

                                    consoleLogger.debug(
                                        `There are ${asyncPreprocessingArray.length} uploads in async-preprocessing. `
                                    );

                                    consoleLogger.debug(
                                        `${uploadIdsToSetError.length} have reached the maximum number of attempts and will be marked as error`
                                    );

                                    consoleLogger.debug(
                                        `${pendingToPreprocess.length} are PENDING and will be preprocessed now. ${processing.length} are still being preprocessed.`
                                    );

                                    return deleteAsyncPreprocessingAndSetErrorAsyncPreprocessing(
                                        {
                                            asyncPreprocessingRepository,
                                            glassUploadsRepository,
                                            glassDocumentsRepository,
                                        },
                                        uploadIdsToSetError
                                    ).run(
                                        () => {
                                            if (pendingToPreprocess.length > 0) {
                                                return getGlassModulesFromDatastore(glassModuleRepository).run(
                                                    glassModules => {
                                                        return preprocessUploads(
                                                            {
                                                                asyncPreprocessingRepository,
                                                                glassUploadsRepository,
                                                                glassDocumentsRepository,
                                                                risIndividualFungalRepository,
                                                                glassAsyncUploadsRepository,
                                                            },
                                                            pendingToPreprocess,
                                                            glassModules,
                                                            maxAttempts
                                                        ).run(
                                                            () => {
                                                                consoleLogger.debug(
                                                                    "Preprocessing completed successfully"
                                                                );
                                                            },
                                                            error => {
                                                                consoleLogger.error(
                                                                    `ERROR - Error during preprocessing: ${error}`
                                                                );
                                                            }
                                                        );
                                                    },
                                                    error =>
                                                        consoleLogger.error(
                                                            `ERROR - Error while getting glass modules from Datastore: ${error}.`
                                                        )
                                                );
                                            } else {
                                                consoleLogger.debug(
                                                    `There is nothing marked for async preprocessing in Datastore.`
                                                );
                                            }
                                        },
                                        error =>
                                            consoleLogger.error(
                                                `ERROR - Error while setting errorAsyncPreprocessing to uploads ${uploadIdsToSetError.join(
                                                    ", "
                                                )} and removing from async-uploads in Datastore: ${error}.`
                                            )
                                    );
                                } else {
                                    consoleLogger.debug(
                                        `There is nothing marked for async preprocessing in Datastore.`
                                    );
                                }
                            },
                            error =>
                                consoleLogger.error(
                                    `ERROR - Error while getting async preprocessing from Datastore: ${error}.`
                                )
                        );
                    },
                    error => consoleLogger.error(`ERROR - Error while getting general info from Datastore: ${error}.`)
                );
            } catch (e) {
                consoleLogger.error(`Async preprocessing have stopped with error: ${e}. Please, restart again.`);
                process.exit(1);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

function getGlassModulesFromDatastore(glassModuleRepository: GlassModuleRepository): FutureData<GlassModule[]> {
    return glassModuleRepository.getAll();
}

function getMaxAttemptsFromDatastore(glassGeneralInfoRepository: GeneralInfoRepository): FutureData<GlassGeneralInfo> {
    return new GetGeneralInformationUseCase(glassGeneralInfoRepository).execute();
}

function getAsyncPreprocessingFromDatastore(
    asyncPreprocessingRepository: AsyncPreprocessingRepository
): FutureData<AsyncPreprocessing[]> {
    return new GetAsyncPreprocessingUseCase(asyncPreprocessingRepository).execute();
}

function deleteAsyncPreprocessingAndMoveToAsyncUpload(
    repositories: {
        asyncPreprocessingRepository: AsyncPreprocessingRepository;
        glassUploadsRepository: GlassUploadsRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
        glassAsyncUploadsRepository: GlassAsyncUploadsRepository;
    },
    uploadId: Id
): FutureData<void> {
    consoleLogger.debug(
        `Removing upload ${uploadId} from async-preprocessing in Datastore and moving to async-uploads`
    );
    return removeAsyncPreprocessingFromDatastore(repositories, [uploadId]).flatMap(() => {
        return new SetAsyncUploadsUseCase(repositories).execute(uploadId, undefined).flatMap(() => {
            return setUploadStatusToUploaded(repositories.glassUploadsRepository, uploadId);
        });
    });
}

function deleteAsyncPreprocessingAndSetErrorAsyncPreprocessing(
    repositories: {
        asyncPreprocessingRepository: AsyncPreprocessingRepository;
        glassUploadsRepository: GlassUploadsRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
    },
    uploadIdsToSetError: Id[],
    errorMessage?: string
): FutureData<void> {
    if (uploadIdsToSetError.length === 0) {
        return Future.success(undefined);
    } else {
        consoleLogger.debug(
            `Setting errorAsyncPreprocessing to uploads ${uploadIdsToSetError.join(
                ", "
            )} and removing from async-preprocessing in Datastore`
        );
        return removeAsyncPreprocessingFromDatastore(repositories, uploadIdsToSetError).flatMap(() => {
            return new SetMultipleErrorAsyncPreprocessingUseCase(repositories.glassUploadsRepository)
                .execute(uploadIdsToSetError, errorMessage)
                .flatMap(() => {
                    return removeDocumentsByUploadId(repositories, uploadIdsToSetError);
                });
        });
    }
}

function removeAsyncPreprocessingFromDatastore(
    repositories: {
        asyncPreprocessingRepository: AsyncPreprocessingRepository;
    },
    uploadIdsToRemove: Id[]
): FutureData<void> {
    return new RemoveAsyncPreprocessingUseCase(repositories.asyncPreprocessingRepository).execute(uploadIdsToRemove);
}

function removeDocumentsByUploadId(
    repositories: {
        glassUploadsRepository: GlassUploadsRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
    },
    uploadIdsToRemove: Id[]
): FutureData<void> {
    return new DeleteDocumentsByUploadIdUseCase(
        repositories.glassDocumentsRepository,
        repositories.glassUploadsRepository
    ).execute(uploadIdsToRemove);
}

function getUploadById(glassUploadsRepository: GlassUploadsRepository, uploadId: Id): FutureData<GlassUploads> {
    return new GetGlassUploadByIdUseCase(glassUploadsRepository).execute(uploadId);
}

function downloadBlob(glassDocumentsRepository: GlassDocumentsRepository, fileId: Id): FutureData<Blob> {
    return new DownloadDocumentUseCase(glassDocumentsRepository).execute(fileId);
}

function setAsyncPreprocessingStatus(
    asyncPreprocessingRepository: AsyncPreprocessingRepository,
    uploadId: Id,
    status: AsyncPreprocessingStatus
): FutureData<void> {
    return new SetAsyncPreprocessingStatusUseCase(asyncPreprocessingRepository).execute(uploadId, status);
}

function setUploadStatusToUploaded(glassUploadsRepository: GlassUploadsRepository, uploadId: Id): FutureData<void> {
    consoleLogger.debug(`Setting upload ${uploadId} status to UPLOADED`);
    return new SetUploadStatusUseCase(glassUploadsRepository).execute({
        id: uploadId,
        status: "UPLOADED",
    });
}

function preprocessUploads(
    repositories: {
        asyncPreprocessingRepository: AsyncPreprocessingRepository;
        glassUploadsRepository: GlassUploadsRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
        risIndividualFungalRepository: RISIndividualFungalDataRepository;
        glassAsyncUploadsRepository: GlassAsyncUploadsRepository;
    },
    uploadsToPreprocess: AsyncPreprocessing[],
    glassModules: GlassModule[],
    maxAttempts: number
): FutureData<void> {
    consoleLogger.debug(`[preprocessUploads] STARTING - Processing ${uploadsToPreprocess.length.toString()} uploads`);
    consoleLogger.debug(`[preprocessUploads] Upload IDs: ${uploadsToPreprocess.map(u => u.uploadId).join(", ")}`);

    return Future.sequential(
        uploadsToPreprocess.map(asyncPreprocessingItem => {
            return setAsyncPreprocessingStatus(
                repositories.asyncPreprocessingRepository,
                asyncPreprocessingItem.uploadId,
                "PREPROCESSING"
            )
                .flatMap(() => {
                    return getUploadById(repositories.glassUploadsRepository, asyncPreprocessingItem.uploadId).flatMap(
                        upload => {
                            if (upload) {
                                consoleLogger.debug(`Found upload ${upload.id}`);
                                const currentModule = glassModules.find(module => module.id === upload.module);

                                if (currentModule) {
                                    return manageAsyncPreprocess(
                                        repositories,
                                        upload,
                                        asyncPreprocessingItem,
                                        currentModule
                                    );
                                } else {
                                    consoleLogger.error(`Module ${upload.module} not found`);
                                    return Future.error(`Module ${upload.module} not found`);
                                }
                            } else {
                                consoleLogger.error(`Upload ${asyncPreprocessingItem.uploadId} not found`);
                                return Future.error(`Upload ${asyncPreprocessingItem.uploadId} not found`);
                            }
                        }
                    );
                })
                .flatMapError(error => {
                    consoleLogger.error(
                        `ERROR - An error occured while preprocessing upload ${asyncPreprocessingItem.uploadId}: ${error}`
                    );
                    return incrementAsyncPreprocessingOrDelete(
                        {
                            asyncPreprocessingRepository: repositories.asyncPreprocessingRepository,
                            glassUploadsRepository: repositories.glassUploadsRepository,
                            glassDocumentsRepository: repositories.glassDocumentsRepository,
                        },
                        asyncPreprocessingItem,
                        maxAttempts,
                        error
                    );
                })
                .flatMap(() => {
                    consoleLogger.debug(
                        `[preprocessUploads] COMPLETED - Preprocessing for upload ${asyncPreprocessingItem.uploadId} done.`
                    );
                    return Future.success(undefined);
                });
        })
    ).toVoid();
}

function manageAsyncPreprocess(
    repositories: {
        asyncPreprocessingRepository: AsyncPreprocessingRepository;
        glassUploadsRepository: GlassUploadsRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
        risIndividualFungalRepository: RISIndividualFungalDataRepository;
        glassAsyncUploadsRepository: GlassAsyncUploadsRepository;
    },
    upload: GlassUploads,
    _asyncPreprocessingItem: AsyncPreprocessing,
    glassModule: GlassModule
): FutureData<void> {
    consoleLogger.debug(`Preprocessing upload ${upload.id} for module ${glassModule.name}`);
    return downloadBlob(repositories.glassDocumentsRepository, upload.fileId).flatMap(fileBlob => {
        consoleLogger.debug(`Downloaded blob for upload ${upload.id} (${fileBlob.size / (1024 * 1024)}mb)`);
        return repositories.risIndividualFungalRepository
            .validate(glassModule.customDataColumns ?? [], fileBlob)
            .flatMap(validation => {
                if (validation.isValid) {
                    consoleLogger.debug(`Upload ${upload.id} passed validation during async preprocessing.`);
                    return deleteAsyncPreprocessingAndMoveToAsyncUpload(repositories, upload.id).flatMap(() => {
                        return Future.success(undefined);
                    });
                } else {
                    consoleLogger.error(`Upload ${upload.id} failed validation during async preprocessing.`);
                    return deleteAsyncPreprocessingAndSetErrorAsyncPreprocessing(repositories, [upload.id]).flatMap(
                        () => {
                            return Future.success(undefined);
                        }
                    );
                }
            });
    });
}

function incrementAsyncPreprocessingOrDelete(
    repositories: {
        asyncPreprocessingRepository: AsyncPreprocessingRepository;
        glassUploadsRepository: GlassUploadsRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
    },
    asyncUpload: AsyncPreprocessing,
    maxAttempts: number,
    error?: string
): FutureData<void> {
    const nextAttempt = asyncUpload.attempts + 1;
    if (nextAttempt >= maxAttempts) {
        consoleLogger.debug(
            `Upload ${asyncUpload.uploadId} has reached the maximum number preprocessing of attempts (${maxAttempts}). Setting errorAsyncPreprocessing in upload and removing from async-preprocessing in Datastore.`
        );
        return deleteAsyncPreprocessingAndSetErrorAsyncPreprocessing(repositories, [asyncUpload.uploadId], error);
    } else {
        consoleLogger.debug(`Increasing preprocessing attempts for upload ${asyncUpload.uploadId}`);
        return repositories.asyncPreprocessingRepository.incrementAttemptsAndResetStatusById(
            asyncUpload.uploadId,
            error
        );
    }
}

main();

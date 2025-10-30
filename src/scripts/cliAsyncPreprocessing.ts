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
                                                            },
                                                            pendingToPreprocess,
                                                            glassModules
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

function deleteAsyncPreprocessingAndSetErrorAsyncPreprocessing(
    repositories: {
        asyncPreprocessingRepository: AsyncPreprocessingRepository;
        glassUploadsRepository: GlassUploadsRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
    },
    uploadIdsToSetError: Id[]
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
                .execute(uploadIdsToSetError)
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

function preprocessUploads(
    repositories: {
        asyncPreprocessingRepository: AsyncPreprocessingRepository;
        glassUploadsRepository: GlassUploadsRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
    },
    uploadsToPreprocess: AsyncPreprocessing[],
    glassModules: GlassModule[]
): FutureData<void> {
    return Future.sequential(
        uploadsToPreprocess.map(asyncPreprocessingItem => {
            try {
                return setAsyncPreprocessingStatus(
                    repositories.asyncPreprocessingRepository,
                    asyncPreprocessingItem.uploadId,
                    "PREPROCESSING"
                )
                    .flatMap(() => {
                        return getUploadById(
                            repositories.glassUploadsRepository,
                            asyncPreprocessingItem.uploadId
                        ).flatMap(upload => {
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
                        });
                    })
                    .flatMapError(error => {
                        consoleLogger.error(
                            `ERROR - An error occured while preprocessing: ${error}. Incrementing attempts and setting errorAsyncPreprocessing in upload.`
                        );
                        //incrementAsyncUploadsOrDeleteIfMaxAttemptAndSetErrorStatus
                        return Future.error(undefined);
                    });
            } catch (e) {
                consoleLogger.error(
                    `ERROR - An error occured while preprocessing: ${e}. Incrementing attempts and setting errorAsyncPreprocessing in upload.`
                );

                //incrementAsyncUploadsOrDeleteIfMaxAttemptAndSetErrorStatus
                return Future.error(undefined);
            }
        })
    ).toVoid();
}

function manageAsyncPreprocess(
    repositories: {
        asyncPreprocessingRepository: AsyncPreprocessingRepository;
        glassUploadsRepository: GlassUploadsRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
    },
    upload: GlassUploads,
    uploadsToPreprocess: AsyncPreprocessing,
    glassModule: GlassModule
) {}

main();

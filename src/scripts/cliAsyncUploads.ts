import { command, run } from "cmd-ts";
import "dotenv/config";

import { getD2ApiFromArgs, getInstance } from "./common";
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { GeneralInfoRepository } from "../domain/repositories/GeneralInfoRepository";
import { GlassGeneralInfo } from "../domain/entities/GlassGeneralInfo";
import { Future, FutureData } from "../domain/entities/Future";
import { GetGeneralInformationUseCase } from "../domain/usecases/GetGeneralInformationUseCase";
import { GeneralInfoDefaultRepository } from "../data/repositories/GeneralInfoDefaultRepository";
import { GlassAsyncUploadsRepository } from "../domain/repositories/GlassAsyncUploadsRepository";
import { GlassAsyncUpload, GlassAsyncUploadStatus } from "../domain/entities/GlassAsyncUploads";
import { GetAsyncUploadsUseCase } from "../domain/usecases/GetAsyncUploadsUseCase";
import { GlassAsyncUploadsDefaultRepository } from "../data/repositories/GlassAsyncUploadsDefaultRepository";
import { Id } from "../domain/entities/Ref";
import { GlassUploadsRepository } from "../domain/repositories/GlassUploadsRepository";
import { RemoveAsyncUploadsUseCase } from "../domain/usecases/RemoveAsyncUploadsUseCase";
import { SetMultipleUploadErrorAsyncUploadingUseCase } from "../domain/usecases/SetMultipleUploadErrorAsyncUploadingUseCase";
import { GlassUploadsDefaultRepository } from "../data/repositories/GlassUploadsDefaultRepository";
import { GlassModuleRepository } from "../domain/repositories/GlassModuleRepository";
import { GlassModule } from "../domain/entities/GlassModule";
import { GlassModuleDefaultRepository } from "../data/repositories/GlassModuleDefaultRepository";
import { GlassUploads, GlassUploadsStatus } from "../domain/entities/GlassUploads";
import { SetUploadStatusUseCase } from "../domain/usecases/SetUploadStatusUseCase";
import { GetGlassUploadByIdUseCase } from "../domain/usecases/GetGlassUploadByIdUseCase";
import { AsyncImportPrimaryFileUseCase } from "../domain/usecases/data-entry/AsyncImportPrimaryFileUseCase";
import { Country } from "../domain/entities/Country";
import { CountryRepository } from "../domain/repositories/CountryRepository";
import { GetAllCountriesUseCase } from "../domain/usecases/GetAllCountriesUseCase";
import { CountryDefaultRepository } from "../data/repositories/CountryDefaultRepository";
import { Maybe } from "../utils/ts-utils";
import { CustomDataColumns } from "../domain/entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";
import { RISIndividualFungalDataRepository } from "../domain/repositories/data-entry/RISIndividualFungalDataRepository";
import { ImportSummary } from "../domain/entities/data-entry/ImportSummary";
import { GlassDocumentsRepository } from "../domain/repositories/GlassDocumentsRepository";
import { DownloadDocumentUseCase } from "../domain/usecases/DownloadDocumentUseCase";
import { GlassDocumentsDefaultRepository } from "../data/repositories/GlassDocumentsDefaultRepository";
import { RISIndividualFungalDataCSVDefaultRepository } from "../data/repositories/data-entry/RISIndividualFungalDataCSVDefaultRepository";
import { SampleDataRepository } from "../domain/repositories/data-entry/SampleDataRepository";
import { AsyncImportSecondaryFileUseCase } from "../domain/usecases/data-entry/AsyncImportSecondaryFileUseCase";
import { SampleDataCSVDeafultRepository } from "../data/repositories/data-entry/SampleDataCSVDeafultRepository";
import { MetadataRepository } from "../domain/repositories/MetadataRepository";
import { TrackerRepository } from "../domain/repositories/TrackerRepository";
import { ProgramRulesMetadataRepository } from "../domain/repositories/program-rules/ProgramRulesMetadataRepository";
import { TrackerDefaultRepository } from "../data/repositories/TrackerDefaultRepository";
import { ProgramRulesMetadataDefaultRepository } from "../data/repositories/program-rule/ProgramRulesMetadataDefaultRepository";
import { MetadataDefaultRepository } from "../data/repositories/MetadataDefaultRepository";
import { DataValuesDefaultRepository } from "../data/repositories/data-entry/DataValuesDefaultRepository";
import { DataValuesRepository } from "../domain/repositories/data-entry/DataValuesRepository";
import { RemoveAsyncUploadByIdUseCase } from "../domain/usecases/RemoveAsyncUploadByIdUseCase";
import { IncrementAsyncUploadAttemptsAndResetStatusUseCase } from "../domain/usecases/IncrementAsyncUploadAttemptsAndResetStatusUseCase";
import { GetAsyncUploadByIdUseCase } from "../domain/usecases/GetAsyncUploadByIdUseCase";
import { SetAsyncUploadStatusUseCase } from "../domain/usecases/SetAsyncUploadStatusUseCase";
import consoleLogger from "../utils/consoleLogger";

const DEFAULT_MAX_ATTEMPS_FOR_ASYNC_UPLOADS = 3;

async function main() {
    const cmd = command({
        name: "Async uploads of files for AMR - Individual and AMR - Fungal Datasets",
        description: "This script takes the upload in Datastore and uploads the data to DHIS2 asynchronously.",
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
                const glassAsyncUploadsRepository = new GlassAsyncUploadsDefaultRepository(dataStoreClient);
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

                consoleLogger.debug(`Running asynchronous upload for URL ${envVars.url}`);
                return getMaxAttemptsForAsyncUploadsFromDatastore(glassGeneralInfoRepository).run(
                    generalInfo => {
                        const maxAttemptsForAsyncUploads =
                            generalInfo?.maxAttemptsForAsyncUploads ?? DEFAULT_MAX_ATTEMPS_FOR_ASYNC_UPLOADS;

                        return getAsyncUploadsFromDatastore(glassAsyncUploadsRepository).run(
                            asyncUploads => {
                                if (asyncUploads && asyncUploads.length > 0) {
                                    const uploadIdsToSetAsyncUploadErrorStatus: Id[] = asyncUploads
                                        .filter(upload => upload.attempts >= maxAttemptsForAsyncUploads)
                                        .flatMap(upload => [upload.uploadId]);

                                    const uploadsToContinueAsyncUpload = asyncUploads.filter(
                                        upload => upload.attempts < maxAttemptsForAsyncUploads
                                    );

                                    consoleLogger.debug(
                                        `There are ${asyncUploads.length} uploads marked for being imported. ${uploadIdsToSetAsyncUploadErrorStatus.length} of them have reached the maximum number of attempts and will be marked as error`
                                    );

                                    return deleteAsyncUploadsAndSetAsyncUploadErrorStatusToUploads(
                                        {
                                            glassAsyncUploadsRepository,
                                            glassUploadsRepository,
                                        },
                                        uploadIdsToSetAsyncUploadErrorStatus
                                    ).run(
                                        () => {
                                            if (uploadsToContinueAsyncUpload.length > 0) {
                                                return getGlassModulesFromDatastore(glassModuleRepository).run(
                                                    glassModules => {
                                                        return getAllCountries(countryRepository).run(
                                                            allCountries => {
                                                                return uploadDatasets(
                                                                    {
                                                                        glassUploadsRepository,
                                                                        glassDocumentsRepository,
                                                                        risIndividualFungalRepository,
                                                                        sampleDataRepository,
                                                                        trackerRepository,
                                                                        programRulesMetadataRepository,
                                                                        metadataRepository,
                                                                        dataValuesRepository,
                                                                        glassAsyncUploadsRepository,
                                                                    },
                                                                    maxAttemptsForAsyncUploads,
                                                                    uploadsToContinueAsyncUpload,
                                                                    glassModules,
                                                                    allCountries
                                                                ).run(
                                                                    () => {
                                                                        consoleLogger.debug(
                                                                            `SUCCESS - Imported all datasets marked for async importing with status PENDING.`
                                                                        );
                                                                    },
                                                                    error => {
                                                                        consoleLogger.error(
                                                                            `ERROR - An error occured while importing: ${error}`
                                                                        );
                                                                    }
                                                                );
                                                            },
                                                            error =>
                                                                consoleLogger.error(
                                                                    `ERROR - Error while getting all countries: ${error}.`
                                                                )
                                                        );
                                                    },
                                                    error =>
                                                        consoleLogger.error(
                                                            `ERROR - Error while getting GLASS modules from Datastore: ${error}.`
                                                        )
                                                );
                                            } else {
                                                consoleLogger.debug(
                                                    `There is nothing marked for async upload in Datastore.`
                                                );
                                            }
                                        },
                                        error =>
                                            consoleLogger.error(
                                                `ERROR - Error while setting errorAsyncUploading in Datastore: ${error}.`
                                            )
                                    );
                                } else {
                                    consoleLogger.debug(`There is nothing marked for async upload in Datastore.`);
                                }
                            },
                            error =>
                                consoleLogger.error(
                                    `ERROR - Error while getting async uploads from Datastore: ${error}.`
                                )
                        );
                    },
                    error => consoleLogger.error(`ERROR - Error while getting general info from Datastore: ${error}.`)
                );
            } catch (e) {
                consoleLogger.error(`Async uploads have stopped with error: ${e}. Please, restart again.`);
                process.exit(1);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

function getMaxAttemptsForAsyncUploadsFromDatastore(
    glassGeneralInfoRepository: GeneralInfoRepository
): FutureData<GlassGeneralInfo> {
    return new GetGeneralInformationUseCase(glassGeneralInfoRepository).execute();
}

function getAsyncUploadsFromDatastore(
    glassAsyncUploadsRepository: GlassAsyncUploadsRepository
): FutureData<GlassAsyncUpload[]> {
    return new GetAsyncUploadsUseCase(glassAsyncUploadsRepository).execute();
}

function removeAsyncUploadsFromDatastore(
    repositories: {
        glassAsyncUploadsRepository: GlassAsyncUploadsRepository;
        glassUploadsRepository: GlassUploadsRepository;
    },
    uploadIdsToRemove: Id[]
): FutureData<void> {
    return new RemoveAsyncUploadsUseCase(repositories).execute(uploadIdsToRemove);
}

function deleteAsyncUploadsAndSetAsyncUploadErrorStatusToUploads(
    repositories: {
        glassAsyncUploadsRepository: GlassAsyncUploadsRepository;
        glassUploadsRepository: GlassUploadsRepository;
    },
    uploadIdsToSetAsyncUploadsErrorStatus: Id[]
): FutureData<void> {
    if (uploadIdsToSetAsyncUploadsErrorStatus.length === 0) {
        return Future.success(undefined);
    } else {
        consoleLogger.debug(
            `Setting errorAsyncUploading to uploads ${uploadIdsToSetAsyncUploadsErrorStatus.join(
                ", "
            )} and removing from async-uploads in Datastore`
        );
        return removeAsyncUploadsFromDatastore(repositories, uploadIdsToSetAsyncUploadsErrorStatus).flatMap(() => {
            return new SetMultipleUploadErrorAsyncUploadingUseCase(repositories.glassUploadsRepository)
                .execute(uploadIdsToSetAsyncUploadsErrorStatus)
                .flatMap(() => {
                    return Future.success(undefined);
                });
        });
    }
}

function getGlassModulesFromDatastore(glassModuleRepository: GlassModuleRepository): FutureData<GlassModule[]> {
    return glassModuleRepository.getAll();
}

function getAllCountries(countryRepository: CountryRepository): FutureData<Country[]> {
    return new GetAllCountriesUseCase(countryRepository).execute();
}

function getUploadById(glassUploadsRepository: GlassUploadsRepository, uploadId: Id): FutureData<GlassUploads> {
    return new GetGlassUploadByIdUseCase(glassUploadsRepository).execute(uploadId).flatMap(upload => {
        return Future.success(upload);
    });
}

function setUploadStatus(
    glassUploadsRepository: GlassUploadsRepository,
    uploadId: Id,
    status: GlassUploadsStatus
): FutureData<void> {
    return new SetUploadStatusUseCase(glassUploadsRepository).execute({
        id: uploadId,
        status: status,
    });
}

function setAsyncUploadStatus(
    glassAsyncUploadsRepository: GlassAsyncUploadsRepository,
    uploadId: Id,
    status: GlassAsyncUploadStatus
): FutureData<void> {
    return new SetAsyncUploadStatusUseCase(glassAsyncUploadsRepository).execute(uploadId, status);
}

function downloadBlob(glassDocumentsRepository: GlassDocumentsRepository, fileId: Id): FutureData<Blob> {
    return new DownloadDocumentUseCase(glassDocumentsRepository).execute(fileId);
}

function removeAsyncUploadByIdFromDatastore(
    glassAsyncUploadsRepository: GlassAsyncUploadsRepository,
    glassUploadsRepository: GlassUploadsRepository,
    uploadIdToRemove: Id
): FutureData<void> {
    consoleLogger.debug(`Removing upload ${uploadIdToRemove} from async-uploads in Datastore`);
    return new RemoveAsyncUploadByIdUseCase({ glassAsyncUploadsRepository, glassUploadsRepository }).execute(
        uploadIdToRemove
    );
}

function incrementAsyncUploadsOrDeleteIfMaxAttemptAndSetErrorStatus(
    glassAsyncUploadsRepository: GlassAsyncUploadsRepository,
    glassUploadsRepository: GlassUploadsRepository,
    asyncUpload: GlassAsyncUpload,
    maxAttemptsForAsyncDeletions: number
): FutureData<void> {
    const nextAttempt = asyncUpload.attempts + 1;
    if (nextAttempt >= maxAttemptsForAsyncDeletions) {
        consoleLogger.debug(
            `Upload ${asyncUpload.uploadId} has reached the maximum number of attempts (${maxAttemptsForAsyncDeletions}). Setting errorAsyncUploading in upload and removing from async-uploads in Datastore.`
        );
        return removeAsyncUploadByIdFromDatastore(
            glassAsyncUploadsRepository,
            glassUploadsRepository,
            asyncUpload.uploadId
        ).flatMap(() => {
            return setUploadStatus(glassUploadsRepository, asyncUpload.uploadId, "UPLOADED").flatMap(() => {
                return new SetMultipleUploadErrorAsyncUploadingUseCase(glassUploadsRepository).execute([
                    asyncUpload.uploadId,
                ]);
            });
        });
    } else {
        return new IncrementAsyncUploadAttemptsAndResetStatusUseCase(glassAsyncUploadsRepository).execute(
            asyncUpload.uploadId
        );
    }
}

function setFinalStatus(
    glassUploadsRepository: GlassUploadsRepository,
    uploadId: Id,
    hasBlockingErrors: boolean,
    hasImportedValues: boolean
): FutureData<void> {
    if (hasBlockingErrors) {
        const status: GlassUploadsStatus = hasImportedValues ? "IMPORTED" : "UPLOADED";
        consoleLogger.debug(`Setting status to ${status} for upload ${uploadId} with blocking errors`);
        return setUploadStatus(glassUploadsRepository, uploadId, status).flatMap(() => {
            return Future.success(undefined);
        });
    } else {
        consoleLogger.debug(`Setting status to VALIDATED for upload ${uploadId} without blocking errors`);
        return setUploadStatus(glassUploadsRepository, uploadId, "VALIDATED").flatMap(() => {
            return Future.success(undefined);
        });
    }
}

function isPendingUpload(glassAsyncUploadsRepository: GlassAsyncUploadsRepository, uploadId: Id): FutureData<boolean> {
    return new GetAsyncUploadByIdUseCase(glassAsyncUploadsRepository).execute(uploadId).flatMap(upload => {
        return Future.success(upload?.status === "PENDING");
    });
}

// STEP 2: Import data & Consistency checks
function asyncPrimaryFileSubmission(
    repositories: {
        risIndividualFungalRepository: RISIndividualFungalDataRepository;
        trackerRepository: TrackerRepository;
        programRulesMetadataRepository: ProgramRulesMetadataRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
        glassUploadsRepository: GlassUploadsRepository;
        metadataRepository: MetadataRepository;
        glassAsyncUploadsRepository: GlassAsyncUploadsRepository;
    },
    params: {
        primaryUploadId: Id;
        inputBlob: Blob;
        glassModule: GlassModule;
        orgUnitId: Id;
        countryCode: string;
        period: string;
        program: Maybe<{
            id: Id;
            programStageId: string;
        }>;
        dataColumns: CustomDataColumns;
        allCountries: Country[];
    }
): FutureData<ImportSummary[]> {
    consoleLogger.debug(
        `Importing primary file ${params.primaryUploadId} for module ${params.glassModule.name}, org unit ${params.orgUnitId} and period ${params.period}`
    );
    return new AsyncImportPrimaryFileUseCase(repositories).execute(params);
}

// STEP 2: Import data & Consistency checks
function asyncSecondaryFileSubmission(
    repositories: {
        metadataRepository: MetadataRepository;
        sampleDataRepository: SampleDataRepository;
        dataValuesRepository: DataValuesRepository;
        glassUploadsRepository: GlassUploadsRepository;
        glassAsyncUploadsRepository: GlassAsyncUploadsRepository;
    },
    params: {
        secondaryUploadId: Id;
        inputBlob: Blob;
        batchId: string;
        glassModule: GlassModule;
        period: string;
        orgUnitId: Id;
        countryCode: string;
        dryRun: boolean;
    }
): FutureData<ImportSummary[]> {
    consoleLogger.debug(
        `Importing secondary file ${params.secondaryUploadId} for module ${params.glassModule.name}, org unit ${params.orgUnitId} and period ${params.period}`
    );
    return new AsyncImportSecondaryFileUseCase(repositories).execute(params);
}

function manageAsyncUploadPrimaryFile(
    repositories: {
        risIndividualFungalRepository: RISIndividualFungalDataRepository;
        trackerRepository: TrackerRepository;
        programRulesMetadataRepository: ProgramRulesMetadataRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
        glassUploadsRepository: GlassUploadsRepository;
        metadataRepository: MetadataRepository;
        glassAsyncUploadsRepository: GlassAsyncUploadsRepository;
    },
    primaryUpload: GlassUploads,
    asyncUpload: GlassAsyncUpload,
    module: GlassModule,
    allCountries: Country[]
): FutureData<void> {
    consoleLogger.debug(
        `Importing ${primaryUpload.id} from module ${module.name}, org unit ${primaryUpload.orgUnit} and period ${primaryUpload.period}`
    );

    return setAsyncUploadStatus(repositories.glassAsyncUploadsRepository, asyncUpload.uploadId, "UPLOADING").flatMap(
        () => {
            return downloadBlob(repositories.glassDocumentsRepository, primaryUpload.fileId).flatMap(inputBlob => {
                consoleLogger.debug(`Downloaded blob for primary upload ${primaryUpload.id}`);
                return asyncPrimaryFileSubmission(repositories, {
                    primaryUploadId: primaryUpload.id,
                    inputBlob: inputBlob,
                    glassModule: module,
                    orgUnitId: primaryUpload.orgUnit,
                    countryCode: primaryUpload.countryCode,
                    period: primaryUpload.period,
                    program: module.programs?.[0],
                    dataColumns: module.customDataColumns || [],
                    allCountries: allCountries,
                }).flatMap(importSummaries => {
                    const hasBlockingErrors = importSummaries.some(summary => summary.blockingErrors.length > 0);
                    const hasImportedValues = importSummaries.some(summary => summary.importCount.imported > 0);
                    if (hasImportedValues) {
                        consoleLogger.debug(
                            `Data has been imported from upload ${primaryUpload.id} from module ${
                                module.name
                            }, org unit ${primaryUpload.orgUnit} and period ${primaryUpload.period} ${
                                hasBlockingErrors ? "with blocking errors" : "without blocking errors"
                            }`
                        );
                    } else {
                        consoleLogger.debug(
                            `Data NOT imported from upload ${primaryUpload.id} from module ${module.name}, org unit ${primaryUpload.orgUnit} and period ${primaryUpload.period} due to blocking errors`
                        );
                    }

                    return setFinalStatus(
                        repositories.glassUploadsRepository,
                        primaryUpload.id,
                        hasBlockingErrors,
                        hasImportedValues
                    ).flatMap(() => {
                        return removeAsyncUploadByIdFromDatastore(
                            repositories.glassAsyncUploadsRepository,
                            repositories.glassUploadsRepository,
                            asyncUpload.uploadId
                        );
                    });
                });
            });
        }
    );
}

function manageAsyncUploadSecondaryFile(
    repositories: {
        metadataRepository: MetadataRepository;
        sampleDataRepository: SampleDataRepository;
        dataValuesRepository: DataValuesRepository;
        glassUploadsRepository: GlassUploadsRepository;
        glassAsyncUploadsRepository: GlassAsyncUploadsRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
    },
    secondaryUpload: GlassUploads,
    asyncUpload: GlassAsyncUpload,
    module: GlassModule
): FutureData<void> {
    consoleLogger.debug(
        `Importing ${secondaryUpload.id} from module ${module.name}, org unit ${secondaryUpload.orgUnit} and period ${secondaryUpload.period}`
    );

    return setAsyncUploadStatus(repositories.glassAsyncUploadsRepository, asyncUpload.uploadId, "UPLOADING").flatMap(
        () => {
            return downloadBlob(repositories.glassDocumentsRepository, secondaryUpload.fileId).flatMap(inputBlob => {
                consoleLogger.debug(`Downloaded blob for secondary upload ${secondaryUpload.id}`);
                const applyDryRun = module.name === "AMR - Individual";

                return asyncSecondaryFileSubmission(repositories, {
                    secondaryUploadId: secondaryUpload.id,
                    inputBlob: inputBlob,
                    glassModule: module,
                    orgUnitId: secondaryUpload.orgUnit,
                    countryCode: secondaryUpload.countryCode,
                    period: secondaryUpload.period,
                    batchId: secondaryUpload.batchId,
                    dryRun: applyDryRun,
                }).flatMap(importSummaries => {
                    const hasBlockingErrors = importSummaries.some(summary => summary.blockingErrors.length > 0);

                    if (applyDryRun && !hasBlockingErrors) {
                        consoleLogger.debug(
                            `No blocking errors found during dry run for secondary upload ${secondaryUpload.id}. Run import without dry run to import data.`
                        );
                        return asyncSecondaryFileSubmission(repositories, {
                            secondaryUploadId: secondaryUpload.id,
                            inputBlob: inputBlob,
                            glassModule: module,
                            orgUnitId: secondaryUpload.orgUnit,
                            countryCode: secondaryUpload.countryCode,
                            period: secondaryUpload.period,
                            batchId: secondaryUpload.batchId,
                            dryRun: false,
                        }).flatMap(importSummaries => {
                            const hasBlockingErrorsWithoutDryRun = importSummaries.some(
                                summary => summary.blockingErrors.length > 0
                            );
                            const hasImportedValuesWithoutDryRun = importSummaries.some(
                                summary => summary.importCount.imported > 0
                            );

                            if (hasImportedValuesWithoutDryRun) {
                                consoleLogger.debug(
                                    `Data has been imported from upload ${secondaryUpload.id} from module ${
                                        module.name
                                    }, org unit ${secondaryUpload.orgUnit} and period ${secondaryUpload.period} ${
                                        hasBlockingErrorsWithoutDryRun
                                            ? "with blocking errors"
                                            : "without blocking errors"
                                    }`
                                );
                            } else {
                                consoleLogger.debug(
                                    `Data NOT imported from upload ${secondaryUpload.id} from module ${module.name}, org unit ${secondaryUpload.orgUnit} and period ${secondaryUpload.period} due to blocking errors`
                                );
                            }

                            return setFinalStatus(
                                repositories.glassUploadsRepository,
                                secondaryUpload.id,
                                hasBlockingErrorsWithoutDryRun,
                                hasImportedValuesWithoutDryRun
                            ).flatMap(() => {
                                return removeAsyncUploadByIdFromDatastore(
                                    repositories.glassAsyncUploadsRepository,
                                    repositories.glassUploadsRepository,
                                    asyncUpload.uploadId
                                );
                            });
                        });
                    } else {
                        const hasImportedValues = importSummaries.some(summary => summary.importCount.imported > 0);

                        if (hasImportedValues) {
                            consoleLogger.debug(
                                `Data has been imported from upload ${secondaryUpload.id} from module ${
                                    module.name
                                }, org unit ${secondaryUpload.orgUnit} and period ${secondaryUpload.period} ${
                                    hasBlockingErrors ? "with blocking errors" : "without blocking errors"
                                }`
                            );
                        } else {
                            consoleLogger.debug(
                                `Data NOT imported from upload ${secondaryUpload.id} from module ${module.name}, org unit ${secondaryUpload.orgUnit} and period ${secondaryUpload.period} due to blocking errors`
                            );
                        }
                        return setFinalStatus(
                            repositories.glassUploadsRepository,
                            secondaryUpload.id,
                            hasBlockingErrors,
                            hasImportedValues
                        ).flatMap(() => {
                            return removeAsyncUploadByIdFromDatastore(
                                repositories.glassAsyncUploadsRepository,
                                repositories.glassUploadsRepository,
                                asyncUpload.uploadId
                            );
                        });
                    }
                });
            });
        }
    );
}

// Async upload only for AMR - Individual and AMR - Fungal modules has the following steps:
// 0. Check if the upload is status "PENDING" importing and set status to "UPLOADING"
// 1. Download the file from the Datastore
// 2. Validate data and import chunked data to DHIS2
// 3. Save all import summaries to Datastore uploads and Event List File Ids if apply
// 4. Set status to "IMPORTED" if there are blocking errors or "VALIDATED" if there are not
// 5. Remove upload from Datastore async-uploads
// *If some error occurs while importing the data, increment the attempts and set errorAsyncUploading in upload if max attempts reached
function uploadDatasets(
    repositories: {
        risIndividualFungalRepository: RISIndividualFungalDataRepository;
        trackerRepository: TrackerRepository;
        programRulesMetadataRepository: ProgramRulesMetadataRepository;
        glassDocumentsRepository: GlassDocumentsRepository;
        glassUploadsRepository: GlassUploadsRepository;
        metadataRepository: MetadataRepository;
        sampleDataRepository: SampleDataRepository;
        dataValuesRepository: DataValuesRepository;
        glassAsyncUploadsRepository: GlassAsyncUploadsRepository;
    },
    maxAttemptsForAsyncUploads: number,
    uploadsToAsyncUpload: GlassAsyncUpload[],
    glassModules: GlassModule[],
    allCountries: Country[]
): FutureData<void> {
    return Future.sequential(
        uploadsToAsyncUpload.map(asyncUpload => {
            try {
                return Future.fromPromise(new Promise(resolve => setTimeout(resolve, 500)))
                    .flatMap(() => {
                        return isPendingUpload(repositories.glassAsyncUploadsRepository, asyncUpload.uploadId).flatMap(
                            isPending => {
                                if (isPending) {
                                    consoleLogger.debug(
                                        `Processing upload ${asyncUpload.uploadId} of type ${asyncUpload.type} and upload id ${asyncUpload.uploadId}`
                                    );
                                    return Future.joinObj({
                                        primaryUpload:
                                            asyncUpload.type === "primary"
                                                ? getUploadById(
                                                      repositories.glassUploadsRepository,
                                                      asyncUpload.uploadId
                                                  )
                                                : Future.success(undefined),
                                        secondaryUpload:
                                            asyncUpload.type === "secondary"
                                                ? getUploadById(
                                                      repositories.glassUploadsRepository,
                                                      asyncUpload.uploadId
                                                  )
                                                : Future.success(undefined),
                                    }).flatMap(({ primaryUpload, secondaryUpload }) => {
                                        if (primaryUpload) {
                                            consoleLogger.debug(`Found primary upload ${primaryUpload.id}`);
                                            const currentModule = glassModules.find(
                                                module => module.id === primaryUpload.module
                                            );

                                            if (currentModule) {
                                                return manageAsyncUploadPrimaryFile(
                                                    repositories,
                                                    primaryUpload,
                                                    asyncUpload,
                                                    currentModule,
                                                    allCountries
                                                );
                                            } else {
                                                consoleLogger.error(`Module ${primaryUpload.module} not found`);
                                                return Future.error(`Module ${primaryUpload.module} not found`);
                                            }
                                        } else if (secondaryUpload) {
                                            consoleLogger.debug(`Found secondary upload ${secondaryUpload.id}`);
                                            const currentModule = glassModules.find(
                                                module => module.id === secondaryUpload.module
                                            );

                                            if (currentModule) {
                                                return manageAsyncUploadSecondaryFile(
                                                    repositories,
                                                    secondaryUpload,
                                                    asyncUpload,
                                                    currentModule
                                                );
                                            } else {
                                                consoleLogger.error(`Module ${secondaryUpload.module} not found`);
                                                return Future.error(`Module ${secondaryUpload.module} not found`);
                                            }
                                        } else {
                                            consoleLogger.error(`Upload ${asyncUpload.uploadId} not found`);
                                            return Future.error(`Upload ${asyncUpload.uploadId} not found`);
                                        }
                                    });
                                } else {
                                    consoleLogger.debug(`Upload ${asyncUpload.uploadId} is not pending deletion`);
                                    return Future.success(undefined);
                                }
                            }
                        );
                    })
                    .flatMapError(error => {
                        consoleLogger.error(
                            `ERROR - An error occured while importing: ${error}. Incrementing attempts and setting errorAsyncUploading in upload.`
                        );
                        return incrementAsyncUploadsOrDeleteIfMaxAttemptAndSetErrorStatus(
                            repositories.glassAsyncUploadsRepository,
                            repositories.glassUploadsRepository,
                            asyncUpload,
                            maxAttemptsForAsyncUploads
                        ).flatMap(() => {
                            return Future.error(error);
                        });
                    });
            } catch (e) {
                consoleLogger.error(
                    `ERROR - An error occured while importing: ${e}. Incrementing attempts and setting errorAsyncUploading in upload.`
                );
                return incrementAsyncUploadsOrDeleteIfMaxAttemptAndSetErrorStatus(
                    repositories.glassAsyncUploadsRepository,
                    repositories.glassUploadsRepository,
                    asyncUpload,
                    maxAttemptsForAsyncUploads
                ).map(() => {
                    return Future.error(e);
                });
            }
        })
    ).toVoid();
}

main();

import _ from "lodash";
import { command, run } from "cmd-ts";
import "dotenv/config";

import { getD2ApiFromArgs, getInstance } from "./common";
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import consoleLogger from "../utils/consoleLogger";
import { D2Api, D2TrackerEventToPost, Id } from "../types/d2-api";
import { Future, FutureData } from "../domain/entities/Future";
import { GlassUploads } from "../domain/entities/GlassUploads";
import { DataStoreKeys } from "../data/data-store/DataStoreKeys";
import {
    AMR_GLASS_PROE_UPLOADS_PROGRAM_ID,
    AMR_GLASS_PROE_UPLOADS_PROGRAM_STAGE_ID,
    uploadsDHIS2Ids,
} from "../data/repositories/GlassUploadsProgramRepository";
import { apiToFuture } from "../utils/futures";
import { UploadsFormData } from "../data/repositories/utils/builders/UploadsFormDataBuilder";
import { NodeUploadsFormDataBuilder } from "../data/repositories/utils/builders/NodeUploadsFormDataBuilder";
import { periodToYearMonthDay } from "../utils/currentPeriodHelper";
import { GlassGeneralInfo } from "../domain/entities/GlassGeneralInfo";

const CHUNK_SIZE = 150;

// TO BE RUN ONCE ONLY

async function main() {
    const cmd = command({
        name: "Migration GLASS Uploads from Datastore to an Event program",
        description: "This script migrates GLASS uploads stored in the Datastore to an Event program in DHIS2.",
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
                const uploadsFormDataBuilder = new NodeUploadsFormDataBuilder();

                consoleLogger.info("Starting migration of GLASS uploads from Datastore to Event program...");

                return checkIfMigrationWasAlreadyRun(dataStoreClient).run(
                    wasAlreadyRun => {
                        if (wasAlreadyRun) {
                            consoleLogger.info(
                                "Migration has already been run previously. Exiting without making any changes."
                            );
                            process.exit(0);
                        } else {
                            return getAllGlassUploadsFromDatastore(dataStoreClient).run(
                                allDatastoreGlassUploads => {
                                    consoleLogger.info(
                                        `Fetched ${allDatastoreGlassUploads.length} GLASS uploads from Datastore.`
                                    );

                                    saveDatastoreUploadsInProgram(
                                        api,
                                        uploadsFormDataBuilder,
                                        allDatastoreGlassUploads
                                    ).run(
                                        () => {
                                            setUploadsMigrationCompletedFlag(dataStoreClient).run(
                                                () => {
                                                    consoleLogger.info(
                                                        "Migration flag set successfully in Datastore General Info."
                                                    );
                                                    consoleLogger.info("Migration completed successfully.");
                                                    process.exit(0);
                                                },
                                                e => {
                                                    consoleLogger.error(
                                                        `Error setting migration flag in Datastore General Info: ${e}`
                                                    );
                                                }
                                            );
                                        },
                                        e => {
                                            consoleLogger.error(`Error saving GLASS uploads to Event program: ${e}`);
                                        }
                                    );
                                },
                                e => {
                                    consoleLogger.error(`Error fetching GLASS uploads from Datastore: ${e}`);
                                }
                            );
                        }
                    },
                    e => {
                        consoleLogger.error(`Error checking migration status: ${e}`);
                        process.exit(1);
                    }
                );
            } catch (e) {
                consoleLogger.error(`Async deletions have stopped with error: ${e}. Please, restart again.`);
                process.exit(1);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

interface GlassUploadsWithFileResourceIds extends GlassUploads {
    asyncImportSummariesId?: Id;
    importSummaryId?: Id;
}

type PartialSaveFileResourceResponse = {
    response?: {
        fileResource?: {
            id?: string;
        };
    };
};

function checkIfMigrationWasAlreadyRun(dataStoreClient: DataStoreClient): FutureData<boolean> {
    return dataStoreClient.getObject<GlassGeneralInfo>(DataStoreKeys.GENERAL).flatMap(generalDataStoreItems => {
        if (generalDataStoreItems?.uploadsMigrationCompleted) {
            return Future.success(true);
        } else {
            return Future.success(false);
        }
    });
}

function setUploadsMigrationCompletedFlag(dataStoreClient: DataStoreClient): FutureData<void> {
    return dataStoreClient.getObject<GlassGeneralInfo>(DataStoreKeys.GENERAL).flatMap(generalDataStoreItems => {
        if (generalDataStoreItems) {
            const updatedGeneralInfo: GlassGeneralInfo = {
                ...generalDataStoreItems,
                uploadsMigrationCompleted: true,
            };
            return dataStoreClient.saveObject<GlassGeneralInfo>(DataStoreKeys.GENERAL, updatedGeneralInfo).map(() => {
                consoleLogger.info("Set uploadsMigrationCompleted flag to true in General Info datastore.");
                return;
            });
        } else {
            return Future.error("General Info not found in Datastore to set uploadsMigrationCompleted flag.");
        }
    });
}

function getAllGlassUploadsFromDatastore(dataStoreClient: DataStoreClient): FutureData<GlassUploads[]> {
    return dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS);
}

function saveDatastoreUploadsInProgram(
    api: D2Api,
    uploadsFormDataBuilder: NodeUploadsFormDataBuilder,
    datastoreGlassUploads: GlassUploads[]
): FutureData<void> {
    return Future.sequential(
        datastoreGlassUploads.map(upload => {
            return saveImportSummaryFilesAndGetGlassUploadWithFileResourceIds(api, uploadsFormDataBuilder, upload);
        })
    ).flatMap(uploadsWithFileResourceIds => {
        return saveUploadsWithFileResourceIds(api, uploadsWithFileResourceIds);
    });
}

function saveUploadsWithFileResourceIds(api: D2Api, uploads: GlassUploadsWithFileResourceIds[]): FutureData<void> {
    consoleLogger.info("Mapping Datastore uploads to Tracker Event uploads.");
    const d2TrackerEvents = uploads.map(upload => mapUploadToEvent(upload));

    return saveInChunks(api, d2TrackerEvents).flatMap(() => {
        consoleLogger.info(`Saved ${d2TrackerEvents.length} uploads in Event program successfully.`);
        return Future.success(undefined);
    });
}

function saveInChunks(api: D2Api, d2TrackerEvents: D2TrackerEventToPost[]): FutureData<void> {
    consoleLogger.info(`Saving uploads in chunks of ${CHUNK_SIZE} in Event program.`);
    const chunkedTrackerEvents = _(d2TrackerEvents).chunk(CHUNK_SIZE).value();

    return Future.sequential(
        chunkedTrackerEvents.map((d2TrackerEventsChunk, index) => {
            consoleLogger.debug(`Saving chunk ${index + 1}/${chunkedTrackerEvents.length} of events...`);

            return apiToFuture(api.tracker.post({ importStrategy: "CREATE" }, { events: d2TrackerEventsChunk }))
                .mapError(error => {
                    consoleLogger.error(
                        `Error saving uploads chunk ${index + 1}/${
                            chunkedTrackerEvents.length
                        } in Event program: ${error}`
                    );
                    return error;
                })
                .flatMap(response => {
                    consoleLogger.info(
                        `Finished saving chunk ${index + 1}/${chunkedTrackerEvents.length} of events. Saved ${
                            d2TrackerEventsChunk.length
                        } uploads.`
                    );

                    if (response.status === "ERROR") {
                        return Future.error(
                            `Error saving uploads chunk ${index + 1}/${
                                chunkedTrackerEvents.length
                            } in Event program. Error response: ${JSON.stringify(response)}`
                        );
                    } else {
                        consoleLogger.info("Uploads chunk saved successfully in Event program.");
                        return Future.success(undefined);
                    }
                });
        })
    )
        .mapError(() => {
            return "Error saving uploads in Event program.";
        })
        .map(() => undefined);
}

function saveEventDataValueFile(api: D2Api, payload: UploadsFormData): FutureData<Id> {
    return apiToFuture(
        api.post<PartialSaveFileResourceResponse>("/fileResources", undefined, payload, {
            requestBodyType: "raw",
        })
    ).flatMap(fileUploadResult => {
        const fileResourceId = fileUploadResult.response?.fileResource?.id;

        if (!fileResourceId) {
            return Future.error("Error when saving event data value file");
        }

        return Future.success(fileResourceId);
    });
}

function saveImportSummaryFilesAndGetGlassUploadWithFileResourceIds(
    api: D2Api,
    uploadsFormDataBuilder: NodeUploadsFormDataBuilder,
    upload: GlassUploads
): FutureData<GlassUploadsWithFileResourceIds> {
    return Future.joinObj({
        asyncImportSummariesId: upload.asyncImportSummaries
            ? saveEventDataValueFile(
                  api,
                  uploadsFormDataBuilder.createAsyncImportSummariesFormData(upload.asyncImportSummaries)
              )
            : Future.success(undefined),
        importSummaryId: upload.importSummary
            ? saveEventDataValueFile(api, uploadsFormDataBuilder.createImportSummaryFormData(upload.importSummary))
            : Future.success(undefined),
    }).map(({ asyncImportSummariesId, importSummaryId }) => {
        if (asyncImportSummariesId) {
            consoleLogger.info(
                `Saved async import summaries file for upload ID ${upload.id}. asyncImportSummariesId: ${asyncImportSummariesId}`
            );
        }

        if (importSummaryId) {
            consoleLogger.info(
                `Saved import summary files for upload ID ${upload.id}. importSummaryId: ${importSummaryId}`
            );
        }

        const updatedUpload: GlassUploadsWithFileResourceIds = {
            ...upload,
            asyncImportSummariesId: asyncImportSummariesId,
            importSummaryId: importSummaryId,
        };
        return updatedUpload;
    });
}

function mapUploadToEvent(upload: GlassUploadsWithFileResourceIds): D2TrackerEventToPost {
    const dataValues = [
        { dataElement: uploadsDHIS2Ids.batchId, value: upload.batchId },
        { dataElement: uploadsDHIS2Ids.countryCode, value: upload.countryCode },
        { dataElement: uploadsDHIS2Ids.documentFileType, value: upload.fileType },
        { dataElement: uploadsDHIS2Ids.documentId, value: upload.fileId },
        { dataElement: uploadsDHIS2Ids.documentName, value: upload.fileName },
        { dataElement: uploadsDHIS2Ids.specimens, value: upload.specimens.join(",") },
        { dataElement: uploadsDHIS2Ids.status, value: upload.status },
        { dataElement: uploadsDHIS2Ids.dataSubmissionId, value: upload.dataSubmission },
        { dataElement: uploadsDHIS2Ids.moduleId, value: upload.module },
        {
            dataElement: uploadsDHIS2Ids.rows,
            value: upload.rows ? upload.rows.toString() : upload.records?.toString() || "0",
        },
        { dataElement: uploadsDHIS2Ids.period, value: upload.period },
        { dataElement: uploadsDHIS2Ids.correspondingRisUploadId, value: upload.correspondingRisUploadId || "" },
        { dataElement: uploadsDHIS2Ids.eventListDocumentId, value: upload.eventListFileId || "" },
        {
            dataElement: uploadsDHIS2Ids.calculatedEventListDocumentId,
            value: upload.calculatedEventListFileId || "",
        },
        {
            dataElement: uploadsDHIS2Ids.eventListDataDeleted,
            value: upload.eventListDataDeleted ? "true" : null,
        },
        {
            dataElement: uploadsDHIS2Ids.calculatedEventListDataDeleted,
            value: upload.calculatedEventListDataDeleted ? "true" : null,
        },
        {
            dataElement: uploadsDHIS2Ids.errorAsyncDeleting,
            value: upload.errorAsyncDeleting ? "true" : null,
        },
        {
            dataElement: uploadsDHIS2Ids.errorAsyncUploading,
            value: upload.errorAsyncUploading ? "true" : null,
        },
        // FIX: null needed to remove the value in DHIS2 if a yes-only field is set to false
    ] as D2TrackerEventToPost["dataValues"];

    const importSummariesDataValues: D2TrackerEventToPost["dataValues"] = [
        ...(upload.importSummaryId
            ? [{ dataElement: uploadsDHIS2Ids.importSummary, value: upload.importSummaryId }]
            : []),
        ...(upload.asyncImportSummariesId
            ? [
                  {
                      dataElement: uploadsDHIS2Ids.asyncImportSummaries,
                      value: upload.asyncImportSummariesId,
                  },
              ]
            : []),
    ];

    const allDataValues: D2TrackerEventToPost["dataValues"] = [...dataValues, ...importSummariesDataValues];

    return {
        event: upload.id,
        program: AMR_GLASS_PROE_UPLOADS_PROGRAM_ID,
        programStage: AMR_GLASS_PROE_UPLOADS_PROGRAM_STAGE_ID,
        orgUnit: upload.orgUnit,
        occurredAt: periodToYearMonthDay(upload.period),
        dataValues: allDataValues,
        createdAt: upload.uploadDate,
    };
}

main();

import _ from "lodash";
import { command, run } from "cmd-ts";
import "dotenv/config";
import moment from "moment-timezone";

import { getD2ApiFromArgs, getInstance } from "./common";
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import consoleLogger from "../utils/consoleLogger";
import {
    D2Api,
    D2TrackerEventSchema,
    D2TrackerEventToPost,
    Id,
    SelectedPick,
    TrackedPager,
    TrackerEventsResponse,
} from "../types/d2-api";
import { Future, FutureData } from "../domain/entities/Future";
import { GlassUploads } from "../domain/entities/GlassUploads";
import { DataStoreKeys } from "../data/data-store/DataStoreKeys";
import { AMR_GLASS_PROE_UPLOADS_PROGRAM_ID, uploadsDHIS2Ids } from "../data/repositories/GlassUploadsProgramRepository";
import { apiToFuture } from "../utils/futures";
import { GlassGeneralInfo } from "../domain/entities/GlassGeneralInfo";
import { allowedNaOrgUnits } from "../data/repositories/InstanceDefaultRepository";

const CHUNK_SIZE = 150;
const DEFAULT_PAGE_SIZE = 300;

// TO BE RUN ONCE ONLY

async function main() {
    const cmd = command({
        name: "Add upload date to uploads in Event program",
        description: "This script adds the upload date to GLASS uploads in Event program in DHIS2.",
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

                consoleLogger.info("Starting migration to add upload date to GLASS uploads in Event program...");

                return checkIfWasAlreadyRun(dataStoreClient).run(
                    wasAlreadyRun => {
                        if (wasAlreadyRun) {
                            consoleLogger.info(
                                "Migration has already been run previously. Exiting without making any changes."
                            );
                            process.exit(0);
                        } else {
                            consoleLogger.info("Migration has not been run before. Proceeding with migration...");
                            consoleLogger.info("Fetching all countries and GLASS uploads from Datastore...");
                            return Future.joinObj({
                                allCountries: getAllCountries(api),
                                allDatastoreGlassUploads: getAllGlassUploadsFromDatastore(dataStoreClient),
                            })
                                .flatMap(({ allCountries, allDatastoreGlassUploads }) => {
                                    consoleLogger.info(
                                        `Fetched ${allDatastoreGlassUploads.length} GLASS uploads from Datastore and ${allCountries.length} countries.`
                                    );

                                    return apiToFuture(api.system.info).flatMap(systemInfo => {
                                        const serverTimeZoneId = systemInfo.serverTimeZoneId;

                                        const uploadMap = new Map<string, GlassUploads>(
                                            allDatastoreGlassUploads.map(u => [u.id, u])
                                        );

                                        return Future.sequential(
                                            allCountries.map(countryId => {
                                                consoleLogger.info(`Processing orgUnit ${countryId} uploads...`);
                                                consoleLogger.info(
                                                    `Fetching uploads for orgUnit ${countryId} from Event program...`
                                                );

                                                return getUploadEvents(api, countryId).flatMap(events => {
                                                    consoleLogger.info(
                                                        `Fetched ${events.length} events for orgUnit ${countryId}`
                                                    );

                                                    if (events.length === 0) {
                                                        consoleLogger.info(
                                                            `No events to update for orgUnit ${countryId}. Skipping...`
                                                        );
                                                        return Future.success(undefined);
                                                    }

                                                    consoleLogger.info(
                                                        `Adding upload date to events for orgUnit ${countryId}...`
                                                    );
                                                    const eventsToUpdate = addUploadDateToEvents(
                                                        events,
                                                        uploadMap,
                                                        serverTimeZoneId
                                                    );

                                                    return saveUploads(api, eventsToUpdate);
                                                });
                                            })
                                        ).map(() => undefined);
                                    });
                                })
                                .run(
                                    () => {
                                        setUploadDateAddedToEventProgramFlag(dataStoreClient).run(
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
                                                process.exit(1);
                                            }
                                        );
                                    },
                                    e => {
                                        consoleLogger.error(`Error processing GLASS uploadDate backfill: ${e}`);
                                        process.exit(1);
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

function checkIfWasAlreadyRun(dataStoreClient: DataStoreClient): FutureData<boolean> {
    return dataStoreClient.getObject<GlassGeneralInfo>(DataStoreKeys.GENERAL).flatMap(generalDataStoreItems => {
        if (generalDataStoreItems?.uploadDateAddedToEventProgram) {
            return Future.success(true);
        } else {
            return Future.success(false);
        }
    });
}

function setUploadDateAddedToEventProgramFlag(dataStoreClient: DataStoreClient): FutureData<void> {
    return dataStoreClient.getObject<GlassGeneralInfo>(DataStoreKeys.GENERAL).flatMap(generalDataStoreItems => {
        if (generalDataStoreItems) {
            const updatedGeneralInfo: GlassGeneralInfo = {
                ...generalDataStoreItems,
                uploadDateAddedToEventProgram: true,
            };
            return dataStoreClient.saveObject<GlassGeneralInfo>(DataStoreKeys.GENERAL, updatedGeneralInfo).map(() => {
                consoleLogger.info("Set uploadDateAddedToEventProgram flag to true in General Info datastore.");
                return;
            });
        } else {
            return Future.error("General Info not found in Datastore to set uploadDateAddedToEventProgram flag.");
        }
    });
}

function getAllGlassUploadsFromDatastore(dataStoreClient: DataStoreClient): FutureData<GlassUploads[]> {
    return dataStoreClient.listCollection<GlassUploads>(DataStoreKeys.UPLOADS);
}

function getAllCountries(api: D2Api): FutureData<Id[]> {
    return apiToFuture(
        api.models.organisationUnits.get({
            fields: { id: true, parent: { code: true } },
            paging: false,
            level: 3,
        })
    ).map(response => {
        return response.objects
            .filter(ou => ou.parent?.code !== "NA" || allowedNaOrgUnits.includes(ou.id))
            .map(ou => ou.id);
    });
}

function getUploadEvents(api: D2Api, orgUnit: Id): FutureData<D2TrackerEventToPostWithCreatedAt[]> {
    const firstPage = 1;
    const pageSize = DEFAULT_PAGE_SIZE;
    const events: D2TrackerEventToPostWithCreatedAt[] = [];

    const fetchPage = (
        page: number,
        accEvents: D2TrackerEventToPostWithCreatedAt[]
    ): FutureData<D2TrackerEventToPostWithCreatedAt[]> => {
        return apiToFuture(
            api.tracker.events.get({
                fields: eventFields,
                program: AMR_GLASS_PROE_UPLOADS_PROGRAM_ID,
                orgUnit: orgUnit,
                ouMode: "SELECTED",
                totalPages: true,
                pageSize,
                page,
            })
        ).flatMap(response => {
            const result = response as FixedTrackerEventsResponse;
            const apiEvents: D2TrackerEventToPostWithCreatedAt[] = result.events ?? result.instances ?? [];
            if (apiEvents.length > 0) accEvents.push(...apiEvents);
            const nextEvents = accEvents;

            if (apiEvents.length === 0) {
                return Future.success(nextEvents);
            }

            const pager = result.pager ?? result;
            const pageCount = pager.pageCount;
            const nextPage = (pager.page ?? page) + 1;

            if (pageCount !== undefined && nextPage <= pageCount) {
                return fetchPage(nextPage, nextEvents);
            }

            return Future.success(nextEvents);
        });
    };

    return fetchPage(firstPage, events);
}

function addUploadDateToEvents(
    uploadEvents: D2TrackerEventToPostWithCreatedAt[],
    uploadMap: Map<string, GlassUploads>,
    serverTimeZoneId: string
): D2TrackerEventToPostWithCreatedAt[] {
    return uploadEvents.map(upload => {
        const dataValuesWithoutUploadDate = upload.dataValues.filter(
            dv => dv.dataElement !== uploadsDHIS2Ids.uploadDate
        );

        const matchingGlassUpload = uploadMap.get(upload.event);

        if (matchingGlassUpload) {
            // Upload is an old upload that was in the Datastore
            const uploadDateDataValue = {
                dataElement: uploadsDHIS2Ids.uploadDate,
                value: matchingGlassUpload.uploadDate,
            };
            return {
                ...upload,
                dataValues: [...dataValuesWithoutUploadDate, uploadDateDataValue],
            };
        } else {
            // Upload is a new upload that was not in the Datastore, so we use createdAt as upload date
            const createdAtUTC = moment.tz(upload.createdAt, serverTimeZoneId).utc();
            const uploadDateDataValue = {
                dataElement: uploadsDHIS2Ids.uploadDate,
                value: createdAtUTC.toISOString(),
            };
            return {
                ...upload,
                dataValues: [...dataValuesWithoutUploadDate, uploadDateDataValue],
            };
        }
    });
}

function saveUploads(api: D2Api, uploadEvents: D2TrackerEventToPostWithCreatedAt[]): FutureData<void> {
    consoleLogger.info(`Updating ${uploadEvents.length} uploads with added upload date to Event program...`);
    return saveInChunks(api, uploadEvents).flatMap(() => {
        consoleLogger.info(`Saved ${uploadEvents.length} uploads in Event program successfully.`);
        return Future.success(undefined);
    });
}

function saveInChunks(api: D2Api, d2TrackerEvents: D2TrackerEventToPostWithCreatedAt[]): FutureData<void> {
    consoleLogger.info(`Saving uploads in chunks of ${CHUNK_SIZE} in Event program.`);
    const chunkedTrackerEvents = _(d2TrackerEvents).chunk(CHUNK_SIZE).value();

    return Future.sequential(
        chunkedTrackerEvents.map((d2TrackerEventsChunk, index) => {
            consoleLogger.debug(`Saving chunk ${index + 1}/${chunkedTrackerEvents.length} of events...`);

            return apiToFuture(api.tracker.post({ importStrategy: "UPDATE" }, { events: d2TrackerEventsChunk }))
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

main();

const eventFields = {
    program: true,
    programStage: true,
    event: true,
    dataValues: {
        dataElement: true,
        value: true,
    },
    orgUnit: true,
    occurredAt: true,
    createdAt: true,
} as const;

type D2TrackerEventToPostWithCreatedAt = D2TrackerEventToPost & {
    createdAt: string;
};

// TODO: update @eyeseetea/d2-api
type FixedTrackedPager = Omit<TrackedPager, "pageCount"> & {
    pageCount?: number;
};

type FixedTrackerEventsResponse = Omit<TrackerEventsResponse<typeof eventFields>, keyof TrackedPager | "pager"> & {
    pager?: FixedTrackedPager;
} & FixedTrackedPager & {
        instances?: SelectedPick<D2TrackerEventSchema, typeof eventFields>[];
        events?: SelectedPick<D2TrackerEventSchema, typeof eventFields>[];
    };

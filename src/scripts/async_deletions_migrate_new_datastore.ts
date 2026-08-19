import { command, run } from "cmd-ts";
import "dotenv/config";

import { getInstance } from "./common";
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { Id } from "../domain/entities/Ref";
import { Future, FutureData } from "../domain/entities/Future";
import { GlassAsyncDeletion } from "../domain/entities/GlassAsyncDeletions";
import { DataStoreKeys } from "../data/data-store/DataStoreKeys";

async function main() {
    const cmd = command({
        name: "Migrate async-deletions datastore to new one",
        description:
            "This script takes the async-deletions data in Datastore and changes the structure to the new one.",
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

                const instance = getInstance(envVars);
                const dataStoreClient = new DataStoreClient(instance);

                console.debug(`Migrate async-deletions for URL ${envVars.url}`);

                return getAsyncDeletionsFromDatastore(dataStoreClient).run(
                    asyncDeletionIds => {
                        const newAsyncDeletions: GlassAsyncDeletion[] = asyncDeletionIds.map(asyncDeletionId => {
                            return {
                                uploadId: asyncDeletionId,
                                attempts: 0,
                                status: "PENDING",
                            };
                        });

                        return setNewAsyncDeletionsInDatastore(dataStoreClient, newAsyncDeletions).run(
                            () => {
                                console.debug("Async deletions have been migrated successfully.");
                            },
                            error =>
                                console.error(`ERROR - Error while setting new async deletions in Datastore: ${error}.`)
                        );
                    },
                    error => console.error(`ERROR - Error while getting async-deletions from Datastore: ${error}.`)
                );
            } catch (e) {
                console.error(`Migration of async-deletions have stopped with error: ${e}. Please, try again.`);
                process.exit(1);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

function getAsyncDeletionsFromDatastore(dataStoreClient: DataStoreClient): FutureData<Id[]> {
    return dataStoreClient.listCollection<Id>(DataStoreKeys.ASYNC_DELETIONS);
}

function setNewAsyncDeletionsInDatastore(
    dataStoreClient: DataStoreClient,
    newAsyncDeletions: GlassAsyncDeletion[]
): FutureData<void> {
    return dataStoreClient.saveObject(DataStoreKeys.ASYNC_DELETIONS, newAsyncDeletions).flatMap(() => {
        return Future.success(undefined);
    });
}

main();

import { command, run } from "cmd-ts";
import path from "path";
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { getD2ApiFromArgs, getInstance } from "./common";
import { DataStoreKeys } from "../data/data-store/DataStoreKeys";
import "dotenv/config";

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Validate EAR signals between dataStore and tracker events",
        args: {},
        handler: async _args => {
            if (!process.env.REACT_APP_DHIS2_BASE_URL)
                throw new Error("REACT_APP_DHIS2_BASE_URL must be set in the .env file");

            if (!process.env.REACT_APP_DHIS2_AUTH) throw new Error("REACT_APP_DHIS2_AUTH must be set in the .env file");

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

            const programId = "SQe26z0smFP";

            console.debug(`Run EAR signals validation for URL ${envVars.url}`);

            try {
                // 1. Fetch all signals from dataStore
                console.debug(`Fetching all signals from dataStore`);
                const signalsFromDataStore = await dataStoreClient
                    .listCollection<any>(DataStoreKeys.SIGNALS)
                    .toPromise()
                    .catch(error => {
                        console.error(`Error thrown when fetching signals from dataStore: ${error}`);
                        throw error;
                    });

                console.debug(`Found ${signalsFromDataStore.length} signals in dataStore`);

                // 2. Fetch all events from program SQe26z0smFP
                console.debug(`Fetching all events from program ${programId}`);
                const eventsFromTracker = await api.events
                    .get({
                        program: programId,
                        fields: {
                            event: true,
                            eventDate: true,
                            orgUnit: true,
                            program: true,
                            programStage: true,
                            dataValues: true,
                        },
                    })
                    .getData()
                    .catch(error => {
                        console.error(`Error thrown when fetching events from tracker: ${error}`);
                        throw error;
                    });

                console.debug(`Found ${eventsFromTracker.events.length} events in tracker`);

                // 3. Extract identifiers for comparison
                const dataStoreSignalIds = new Set(signalsFromDataStore.map((signal: any) => signal.eventId));
                const trackerEventIds = new Set(eventsFromTracker.events.map(event => event.event));

                // 4. Find missing events
                const eventsNotInDataStore = [...trackerEventIds].filter(eventId => !dataStoreSignalIds.has(eventId));
                const eventsNotInTracker = [...dataStoreSignalIds].filter(signalId => !trackerEventIds.has(signalId));

                // 5. Report results
                console.debug("\n=== EAR SIGNALS VALIDATION RESULTS ===");
                console.debug(`\nDataStore signals count: ${signalsFromDataStore.length}`);
                console.debug(`Tracker events count: ${eventsFromTracker.events.length}`);

                console.debug(`\n--- Events missing in dataStore (${eventsNotInDataStore.length}) ---`);
                if (eventsNotInDataStore.length > 0) {
                    eventsNotInDataStore.forEach(eventId => {
                        const event = eventsFromTracker.events.find(e => e.event === eventId);
                        console.debug(`Event ID: ${eventId}, Date: ${event?.eventDate}, OrgUnit: ${event?.orgUnit}`);
                    });
                } else {
                    console.debug("No events missing in dataStore");
                }

                console.debug(`\n--- Events missing in tracker (${eventsNotInTracker.length}) ---`);
                if (eventsNotInTracker.length > 0) {
                    eventsNotInTracker.forEach(signalId => {
                        console.debug(`Event ID: ${signalId}`);
                    });
                } else {
                    console.debug("No events missing in tracker");
                }

                // 6. Summary
                const totalDiscrepancies = eventsNotInDataStore.length + eventsNotInTracker.length;
                console.debug(`\n=== SUMMARY ===`);
                console.debug(`Total discrepancies found: ${totalDiscrepancies}`);

                if (totalDiscrepancies === 0) {
                    console.debug("✅ All signals are synchronized between dataStore and tracker");
                } else {
                    console.debug("❌ Synchronization issues detected between dataStore and tracker");
                }
            } catch (error) {
                console.error(`Error thrown when validating EAR signals: ${error}`);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

main();

import { boolean, command, flag, run } from "cmd-ts";
import path from "path";
import fs from "fs";
import { D2TrackerEvent, TrackerEventsResponse } from "@eyeseetea/d2-api/api/trackerEvents";
import _ from "lodash";

import { getD2ApiFromArgs } from "./common";
import { Future, FutureData } from "../domain/entities/Future";
import { D2Api } from "../types/d2-api";
import { Id } from "../domain/entities/Ref";
import { importApiTracker } from "../data/repositories/utils/importApiTracker";
import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";

const OLD_AMR_GLASS_AMC_DET_TONS_AUTOCALCULATED = "Ow8jz1uWB1V";

// PRODUCT LEVEL:
const AMC_PRODUCT_REGISTER_PROGRAM_ID = "G6ChA5zMW9n";
const AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID = "q8cl5qllyjd";

// SUBSTANCE LEVEL:
const AMC_CALCULATED_CONSUMPTION_DATA_PROGRAM_ID = "eUmWZeKZNrg";

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Update in AMC tonnes autocalculated from tonnes to kilograms",
        args: {
            importUpdates: flag({
                type: boolean,
                long: "import-updates",
                description: "Option to import to DHIS2 the updated D2TrackerEvents from tonnes to kilograms",
            }),
        },
        handler: async ({ importUpdates }) => {
            if (!process.env.REACT_APP_DHIS2_BASE_URL)
                throw new Error("REACT_APP_DHIS2_BASE_URL  must be set in the .env file");

            if (!process.env.REACT_APP_DHIS2_AUTH)
                throw new Error("REACT_APP_DHIS2_BASE_URL  must be set in the .env file");

            const username = process.env.REACT_APP_DHIS2_AUTH.split(":")[0] ?? "";
            const password = process.env.REACT_APP_DHIS2_AUTH.split(":")[1] ?? "";

            if (username === "" || password === "") {
                throw new Error("REACT_APP_DHIS2_AUTH must be in the format 'username:password'");
            }
            console.debug(
                `Update in AMC tonnes autocalculated from tonnes to kilograms in ${process.env.REACT_APP_DHIS2_BASE_URL}`
            );

            const envVars = {
                url: process.env.REACT_APP_DHIS2_BASE_URL,
                auth: {
                    username: username,
                    password: password,
                },
            };

            try {
                const api = getD2ApiFromArgs(envVars);
                console.debug(`Fetching all D2TrackerEvents...`);
                return getD2TrackerEventsInPrograms(api).run(
                    d2TrackerEvents => {
                        const d2TrackerEventsWithKilogram = updateDataValueTonsToKilograms(d2TrackerEvents);
                        if (importUpdates && d2TrackerEvents.length > 0) {
                            console.debug(
                                `Updated ${d2TrackerEventsWithKilogram.length} D2TrackerEvents from tonnes to kilograms. Next import them in DHIS2.`
                            );
                            return importUpdatedD2TrackerEvents(api, d2TrackerEventsWithKilogram).run(
                                response => {
                                    if (response.status === "ERROR") {
                                        console.error(`Error importing updated D2TrackerEvents.`);
                                        const errorReport = JSON.stringify(
                                            [
                                                ...response.validationReport.errorReports,
                                                ...response.validationReport.warningReports,
                                            ],
                                            null,
                                            2
                                        );
                                        const filePath = path.join(__dirname, `error_response_report.json`);
                                        fs.writeFileSync(filePath, errorReport);
                                        throw new Error(
                                            `Error importing updated D2TrackerEvents: ${response.stats.ignored}/${response.stats.total}`
                                        );
                                    } else {
                                        console.debug(
                                            `Successfully updated in DHIS2 from tonnes to kilograms: ${response.stats.updated}/${response.stats.total} events updated.`
                                        );
                                    }
                                },
                                error => console.error(`ERROR: ${error}.`)
                            );
                        } else {
                            const d2TrackerEventsJSON = JSON.stringify(d2TrackerEventsWithKilogram, null, 2);
                            const filePath = path.join(__dirname, `d2_tracker_events_updated.json`);
                            fs.writeFileSync(filePath, d2TrackerEventsJSON);
                            console.debug(
                                `Successfully updated ${d2TrackerEventsWithKilogram.length} D2TrackerEvents from tonnes to kilograms.`
                            );
                        }
                    },
                    error => console.error(`ERROR: ${error}.`)
                );
            } catch (error) {
                console.error(`Error thrown when updating from tonnes to kilograms: ${error}`);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

main();

function updateDataValueTonsToKilograms(d2TrackerEvents: D2TrackerEvent[]): D2TrackerEvent[] {
    return d2TrackerEvents
        .filter(
            d2TrackerEvent =>
                d2TrackerEvent.dataValues.length > 0 &&
                d2TrackerEvent.dataValues.some(
                    dataValue => dataValue.dataElement === OLD_AMR_GLASS_AMC_DET_TONS_AUTOCALCULATED
                )
        )
        .map(d2TrackerEvent => {
            const dataValues = d2TrackerEvent.dataValues.map(dataValue => {
                if (dataValue.dataElement === OLD_AMR_GLASS_AMC_DET_TONS_AUTOCALCULATED) {
                    return { ...dataValue, value: (parseFloat(dataValue.value) * 1000).toString() };
                } else {
                    return dataValue;
                }
            });

            return { ...d2TrackerEvent, dataValues };
        });
}

function importUpdatedD2TrackerEvents(api: D2Api, d2TrackerEvents: D2TrackerEvent[]): FutureData<TrackerPostResponse> {
    console.debug(`Importing updated D2TrackerEvents...`);
    return importApiTracker(api, { events: d2TrackerEvents }, "UPDATE");
}

function getD2TrackerEventsInPrograms(api: D2Api): FutureData<D2TrackerEvent[]> {
    return Future.sequential(
        [AMC_PRODUCT_REGISTER_PROGRAM_ID, AMC_CALCULATED_CONSUMPTION_DATA_PROGRAM_ID].map(programId => {
            return Future.fromPromise(new Promise(resolve => setTimeout(resolve, 1000))).flatMap(() => {
                console.debug(`Fetching D2TrackerEvents from program ${programId}...`);
                const programStageId =
                    programId === AMC_PRODUCT_REGISTER_PROGRAM_ID
                        ? AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID
                        : undefined;
                return getAllD2TrackerEventsFromProgram(api, programId, programStageId);
            });
        })
    ).map(values => {
        return _.flatten(values);
    });
}

function getAllD2TrackerEventsFromProgram(
    api: D2Api,
    programId: Id,
    programStageId?: Id
): FutureData<D2TrackerEvent[]> {
    return Future.fromPromise(getD2TrackerEventsFromProgramAsync(api, programId, programStageId));
}

async function getD2TrackerEventsFromProgramAsync(
    api: D2Api,
    programId: Id,
    programStageId?: Id
): Promise<D2TrackerEvent[]> {
    const d2TrackerEvents: D2TrackerEvent[] = [];
    const totalPages = true;
    const pageSize = 250;
    let page = 1;
    let result;
    try {
        do {
            result = await getD2TrackerEventsFromProgramOfPage(
                api,
                programStageId
                    ? {
                          program: programId,
                          programStage: programStageId,
                          page,
                          pageSize,
                          totalPages,
                      }
                    : {
                          program: programId,
                          page,
                          pageSize,
                          totalPages,
                      }
            );
            console.debug(
                `Fetched page ${page}/${Math.ceil(
                    (result.total as number) / pageSize
                )} of D2TrackerEvents from program ${programId}`
            );
            if (!result.total) {
                throw new Error(
                    `Error getting paginated events of program ${programId} and program stage ${programStageId}`
                );
            }
            d2TrackerEvents.push(...result.instances);
            page++;
        } while (result.page < Math.ceil((result.total as number) / pageSize));
        return d2TrackerEvents;
    } catch (e) {
        return [];
    }
}

function getD2TrackerEventsFromProgramOfPage(
    api: D2Api,
    params: {
        program: Id;
        programStage?: Id;
        page: number;
        pageSize: number;
        totalPages?: boolean;
    }
): Promise<TrackerEventsResponse> {
    return api.tracker.events
        .get({
            fields: eventFields,
            ...params,
        })
        .getData();
}

const eventFields = {
    event: true,
    occurredAt: true,
    dataValues: true,
    trackedEntity: true,
    enrollment: true,
    program: true,
    programStage: true,
    orgUnit: true,
} as const;

import { boolean, command, flag, run } from "cmd-ts";
import path from "path";
import fs from "fs";
import { D2TrackerEventSchema, TrackerEventsResponse } from "@eyeseetea/d2-api/api/trackerEvents";

import { getD2ApiFromArgs } from "./common";
import { Future, FutureData } from "../domain/entities/Future";
import { D2Api, SelectedPick } from "../types/d2-api";
import { Id } from "../domain/entities/Ref";
import { apiToFuture } from "../utils/futures";

const KOSOVO_ORG_UNIT_ID = "I8AMbKhxlj9";
const OLD_AMR_GLASS_AMC_DET_TONS_AUTOCALCULATED = "Ow8jz1uWB1V";

// PRODUCT LEVEL:
const AMC_PRODUCT_REGISTER_PROGRAM_ID = "G6ChA5zMW9n";
const AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID = "q8cl5qllyjd";

// SUBSTANCE LEVEL:
const AMC_CALCULATED_CONSUMPTION_DATA_PROGRAM_ID = "eUmWZeKZNrg";

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Get max and min value of autocalculated tons in AMC",
        args: {
            products: flag({
                type: boolean,
                long: "products",
                description: "Option to get max and min tons values from calculated consumption of products",
            }),
            substances: flag({
                type: boolean,
                long: "substances",
                description: "Option to get max and min tons values from calculated consumption of substances",
            }),
        },
        handler: async args => {
            if (!process.env.REACT_APP_DHIS2_BASE_URL)
                throw new Error("REACT_APP_DHIS2_BASE_URL  must be set in the .env file");

            if (!process.env.REACT_APP_DHIS2_AUTH)
                throw new Error("REACT_APP_DHIS2_BASE_URL  must be set in the .env file");

            const username = process.env.REACT_APP_DHIS2_AUTH.split(":")[0] ?? "";
            const password = process.env.REACT_APP_DHIS2_AUTH.split(":")[1] ?? "";

            if (username === "" || password === "") {
                throw new Error("REACT_APP_DHIS2_AUTH must be in the format 'username:password'");
            }

            if (!args.products && !args.substances) throw new Error("products or substances flag is required");
            const programId = args.products
                ? AMC_PRODUCT_REGISTER_PROGRAM_ID
                : AMC_CALCULATED_CONSUMPTION_DATA_PROGRAM_ID;
            const programStageId = args.products ? AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID : undefined;

            const envVars = {
                url: process.env.REACT_APP_DHIS2_BASE_URL,
                auth: {
                    username: username,
                    password: password,
                },
            };

            const api = getD2ApiFromArgs(envVars);

            try {
                console.debug(`Fetching all org units...`);
                return getAllOrgUnitsIds(api).run(
                    orgUnitsIds => {
                        console.debug(`Total org units fetched: ${orgUnitsIds.length}`);
                        return getAutocalculatedTonsValues(api, orgUnitsIds, programId, programStageId).run(
                            maxMinValues => {
                                const content = `Mínimo: ${maxMinValues.min}\nMáximo: ${maxMinValues.max}`;
                                console.debug(content);

                                const maxMin = JSON.stringify(maxMinValues, null, 2);
                                const filePath = path.join(
                                    __dirname,
                                    `${args.products ? "products" : "substances"}_max_min_calculated_tons.json`
                                );
                                fs.writeFileSync(filePath, maxMin);
                            },
                            error => console.error(`ERROR: ${error}.`)
                        );
                    },
                    error => console.error(`ERROR: ${error}.`)
                );
            } catch (error) {
                console.error(`Error thrown when getting max and min value of autocalculated tons: ${error}`);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

main();

function getAllOrgUnitsIds(api: D2Api): FutureData<Id[]> {
    return apiToFuture(
        api.models.organisationUnits.get({
            fields: {
                id: true,
            },
            paging: false,
            level: 3,
        })
    ).map(response => {
        return [...response.objects.map(orgUnit => orgUnit.id), KOSOVO_ORG_UNIT_ID];
    });
}

function getAutocalculatedTonsValues(
    api: D2Api,
    orgUnitsIds: Id[],
    programId: Id,
    programStageId?: Id
): FutureData<{
    min: number;
    max: number;
}> {
    console.debug(`Fetching autocaculated tons values...`);
    return Future.sequential(
        orgUnitsIds.map(orgUnitId => {
            return Future.fromPromise(new Promise(resolve => setTimeout(resolve, 100))).flatMap(() => {
                return getAllD2EventsFromProgramByOrgUnit(api, orgUnitId, programId, programStageId).map(d2Events => {
                    return d2Events.map(d2Event => {
                        const dataValue = d2Event.dataValues.find(
                            dataValue => dataValue.dataElement === OLD_AMR_GLASS_AMC_DET_TONS_AUTOCALCULATED
                        );
                        return parseFloat(dataValue?.value ?? "0");
                    });
                });
            });
        })
    ).map(values => {
        console.debug(`Autocaculated tons values fetched`);
        const flattenValues = values.flat();

        const { min, max } = flattenValues
            .filter(tons => tons !== 0)
            .reduce(
                (acc, val) => ({
                    min: Math.min(acc.min, val),
                    max: Math.max(acc.max, val),
                }),
                { min: Infinity, max: -Infinity }
            );

        return { min: min, max: max };
    });
}

function getAllD2EventsFromProgramByOrgUnit(
    api: D2Api,
    orgUnitId: Id,
    programId: Id,
    programStageId?: Id
): FutureData<D2TrackerEvent[]> {
    return Future.fromPromise(getEventsFromProgramByOrgUnitAsync(api, orgUnitId, programId, programStageId));
}

async function getEventsFromProgramByOrgUnitAsync(
    api: D2Api,
    orgUnit: Id,
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
            result = await getEventsFromProgramByOrgUnitOfPage(
                api,
                programStageId
                    ? {
                          orgUnit,
                          program: programId,
                          programStage: programStageId,
                          page,
                          pageSize,
                          totalPages,
                      }
                    : {
                          orgUnit,
                          program: programId,
                          page,
                          pageSize,
                          totalPages,
                      }
            );
            if (!result.total) {
                throw new Error(
                    `Error getting paginated events of program ${programId} and program stage ${programStageId} in organisation ${orgUnit}`
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

function getEventsFromProgramByOrgUnitOfPage(
    api: D2Api,
    params: {
        orgUnit: Id;
        program: Id;
        programStage?: Id;
        occurredAfter?: string;
        occurredBefore?: string;
        page: number;
        pageSize: number;
        totalPages?: boolean;
    }
): Promise<TrackerEventsResponse<typeof eventFields>> {
    return api.tracker.events
        .get({
            fields: eventFields,
            ...params,
        })
        .getData();
}

const eventFields = {
    dataValues: true,
} as const;

type D2TrackerEvent = SelectedPick<D2TrackerEventSchema, typeof eventFields>;

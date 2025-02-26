/* eslint-disable no-console */

import { apiToFuture } from "../../../utils/futures";
import { DataValue } from "../../../domain/entities/data-entry/DataValue";
import { DataValuesSaveSummary, ImportStrategy } from "../../../domain/entities/data-entry/DataValuesSaveSummary";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { DataValuesImportRepository } from "../../../domain/repositories/data-entry/DataValuesImportRepository";

export class DataValuesDefaultImportRepository implements DataValuesImportRepository {
    private api: D2Api;

    constructor(api: D2Api) {
        this.api = api;
    }

    async save(dataValues: DataValue[], action: ImportStrategy, dryRun: boolean): Promise<DataValuesSaveSummary> {
        console.log("Starting save process for dataValues:", dataValues.length, "entries.");

        // Log the API call for the initial postSetAsync
        const uniquepostSetAsyncLabel = `postSetAsync_${Date.now()}`;
        console.time(uniquepostSetAsyncLabel);

        try {
            const postResponse = await apiToFuture(
                this.api.dataValues.postSetAsync(
                    {
                        importStrategy: action,
                        dryRun: dryRun,
                        preheatCache: !dryRun,
                    },
                    { dataValues }
                )
            ).toPromise();

            console.timeEnd(uniquepostSetAsyncLabel);
            console.log("DataValuesImportRepository save postResponse received:", postResponse);
            console.log(`Job Type: ${postResponse.response.jobType}, Job ID: ${postResponse.response.id}`);

            let waitForRetries = 0;

            // Log the start of waitFor and measure how long it takes
            const uniquewaitForLabel = `waitFor_${Date.now()}`;
            console.time(uniquewaitForLabel);

            const result = await apiToFuture(
                this.api.system.waitFor(postResponse.response.jobType, postResponse.response.id, {})
            ).toPromise();

            waitForRetries++;
            console.timeEnd(uniquewaitForLabel);
            //console.log(`waitFor completed after ${waitForRetries} retry(ies).`);
            console.log("waitFor result: ", result);
            if (!result || !result.importCount) {
                const errorMessage = `An unexpected error occurred. Result was empty: ${result} on the ${waitForRetries} retry`;
                throw new Error(errorMessage);
            }

            return this.processResult(result, postResponse.response.created);
        } catch (error) {
            const errorMessage = `An error occurred while saving data values. Error: ${
                error instanceof Error ? error.message : error
            }`;
            throw new Error(errorMessage);
        }
    }

    private processResult(result: any, createdDate: string): DataValuesSaveSummary {
        return {
            status: result.status || "ERROR",
            description: result.description || "No description provided",
            importCount: {
                imported: result.importCount.imported ?? 0,
                updated: result.importCount.updated ?? 0,
                ignored: result.importCount.ignored ?? 0,
                deleted: result.importCount.deleted ?? 0,
            },
            conflicts: result.conflicts || [],
            importTime: new Date(createdDate),
        };
    }

    // Helper method to handle errors
    private handleError(createdDate: Date, message: string): DataValuesSaveSummary {
        return {
            status: "ERROR",
            description: message,
            importCount: {
                imported: 0,
                updated: 0,
                ignored: 0,
                deleted: 0,
            },
            conflicts: [],
            importTime: createdDate,
        };
    }
}

import { command, run, string, option } from "cmd-ts";
import path from "path";
import fs from "fs";

import dotenv from "dotenv";

import { getInstance, warmUpSession } from "./common";
import { getD2APiFromInstance } from "../utils/d2-api";
import { DataValueSetsDataValue } from "@eyeseetea/d2-api/api";
dotenv.config();

console.log("Base URL:", process.env.REACT_APP_DHIS2_BASE_URL);
console.log("Auth:", process.env.REACT_APP_DHIS2_AUTH);
console.log("REACT_APP_DHIS2_BASE_URL:", process.env.REACT_APP_DHIS2_BASE_URL);

function chunkArray(array: DataValueSetsDataValue[], chunkSize: number) {
    const result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize));
    }
    return result;
}

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Show DHIS2 instance info",
        args: {
            /*   orgUnitId: option({
                type: string,
                long: "orgUnit",
                description: "The org unit id to run amr-agg data reset for",
            }),
            orgUnitCode: option({
                type: string,
                long: "orgUnitCode",
                description: "The org unit code to run amr-agg data reset for",
            }),
            batchId: option({
                type: string,
                long: "batchId",
                description: "The batchId/dataset to run amr-agg data reset for",
            }),*/
            dataSet: option({
                type: string,
                long: "dataSet",
                description: "The dataSet to run amr-agg data reset for",
            }),
            period: option({
                type: string,
                long: "period",
                description: "The period to run amr-agg data reset for",
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
            const envVars = {
                url: process.env.REACT_APP_DHIS2_BASE_URL,
                auth: {
                    username: username,
                    password: password,
                },
            };

            const instance = getInstance(envVars);
            const api = getD2APiFromInstance(instance);
            await warmUpSession(api);
            let batchIds: string[] = [];

            //1. Get Period for which to reset.
            if (!args.period) throw new Error("Period is required");
            const period = args.period;

            if (!args.dataSet) throw new Error("DataSet is required");

            //4. Set AMR-AGG dataset id.
            let dataSetId;
            if (args.dataSet === "RIS") {
                dataSetId = "CeQPmXgrhHF";
            } else if (args.dataSet === "SAMPLE") {
                dataSetId = "OcAB7oaC072";
            } else {
                throw new Error("DataSet is not recognized. It needs to be either RIS or SAMPLE");
            }

            console.debug(
                `Run AMR AGG data reset for URL ${envVars.url} and period ${period} and dataSet ${args.dataSet}`
            );

            try {
                const orgUnits = await api.models.organisationUnits
                    .get({
                        fields: { id: true, name: true, code: true },
                        filter: { level: { eq: "3" } },
                        paging: false,
                    })
                    .getData()
                    .catch(error => {
                        console.error(`Error thrown when fetching countries : ${error}`);
                        throw error;
                    });

                //2.b) Add Kosovo to the list of countries
                orgUnits.objects.push({
                    id: "I8AMbKhxlj9",
                    name: "Kosovo",
                    code: "601624",
                });

                batchIds = ["DS1", "DS2", "DS3", "DS4", "DS5", "DS6"];

                //Get all category option combos for containing all batchIds
                console.debug(`Fetching all category combination options containing batch ids `);
                const allBatchIdCC = await Promise.all(
                    batchIds.map(async batchId => {
                        const batchCC = await api.models.categoryOptionCombos
                            .get({
                                fields: { id: true, name: true },
                                filter: { identifiable: { token: batchId } },
                                paging: false,
                            })
                            .getData()
                            .catch(error => {
                                console.error(
                                    `Error thrown when fetching category combination options containing batch id : ${batchId}, error : ${error}`
                                );
                                throw error;
                            });

                        return batchCC.objects.map(coc => {
                            return {
                                batchId: batchId,
                                categoryComboId: coc.id,
                            };
                        });
                    })
                );
                const allBatchIdCategoryCombos = allBatchIdCC.flat();

                //4. Get all data values for all countries and period
                console.debug(
                    `Fetching all data values for AMR ${args.dataSet} data set for all countries and period: `,
                    period
                );
                const dataSetValues = await api.dataValues
                    .getSet({
                        dataSet: [dataSetId],
                        orgUnit: orgUnits.objects.map(ou => ou.id),
                        period: [period],
                    })
                    .getData()
                    .catch(error => {
                        console.error(`Error thrown when fetching data values for AMR RIS data set : ${error}`);
                        throw error;
                    });

                //4.b) Filter data values for given batchId
                const filteredDataValues = dataSetValues.dataValues.filter(dv =>
                    allBatchIdCategoryCombos.map(coc => coc.categoryComboId.includes(dv.attributeOptionCombo))
                );

                if (filteredDataValues.length === 0)
                    throw new Error(`No data values found for period ${period},  for dataSet ${args.dataSet}`);

                console.debug(
                    `${filteredDataValues.length} data values found for period ${period}, for dataSet ${args.dataSet}`
                );

                const orgUnitsToUpdate = filteredDataValues.map(dataValue => dataValue.orgUnit);
                const uniqueOrgUnitsToUpdate = Array.from(new Set(orgUnitsToUpdate));
                fs.writeFile(
                    "uniqueOrgUnitsToUpdate" + args.dataSet + ".json",
                    JSON.stringify(uniqueOrgUnitsToUpdate, null, 2),
                    err => {
                        if (err) {
                            console.error("Error writing file:", err);
                        } else {
                            console.log("The uniqueOrgUnitsToUpdate file has been written successfully");
                        }
                    }
                );

                /* const updatedDataValues = {
                    dataValues: filteredDataValues.map(dataValue => {
                        return {
                            ...dataValue,
                            value: "",
                        };
                    }),
                };
                console.log("updatedDataValues.dataValues.length: ", updatedDataValues.dataValues.length);
                */

                // Step 1: Create the updated dataValues array
                const updatedDataValues1 = filteredDataValues.map(dataValue => ({
                    ...dataValue,
                    value: "",
                }));
                console.log("updatedDataValues1.length: ", updatedDataValues1.length);
                const numChunks = 4; // Change as per your requirement
                const chunkSize = Math.ceil(updatedDataValues1.length / numChunks);

                const chunkedDataValuesArray = chunkArray(updatedDataValues1, chunkSize);

                // Step 3: Wrap each chunk in an object with the "dataValues" key
                const chunkedUpdatedDataValuesObjects = chunkedDataValuesArray.map(chunk => ({
                    dataValues: chunk,
                }));
                //5.  Create a json object with data values for given country and period with empty values
                //const updateJson = JSON.stringify(updatedDataValues, null, 2);
                const regex = /[^/]+$/;
                const environment = process.env.REACT_APP_DHIS2_BASE_URL.match(regex);
                //fs.writeFileSync(`AMR_AGG_reset_${period}_${args.dataSet}_${environment}.json`, updateJson);
                console.log("chunkedUpdatedDataValuesObjects.length: ", chunkedUpdatedDataValuesObjects.length);
                console.log("chunkSize: ", chunkSize);
                for (let i = 0; i < chunkedUpdatedDataValuesObjects.length; i++) {
                    const chunk = chunkedUpdatedDataValuesObjects[i];
                    const fileName = `AMR_AGG_reset_${period}_${args.dataSet}_${environment}_part${i + 1}.json`;
                    fs.writeFileSync(fileName, JSON.stringify(chunk, null, 2));

                    // Log file writing for confirmation
                    console.log(`Written file: ${fileName}`);
                }
            } catch (error) {
                console.error(`Error thrown when resetting AMR AGG ${dataSetId} data: ${error}`);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

main();

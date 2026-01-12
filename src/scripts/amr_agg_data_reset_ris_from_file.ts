import { command, run, string, option } from "cmd-ts";
import path from "path";
import fs from "fs";
import { getD2ApiFromArgs, getInstance } from "./common";
import dotenv from "dotenv";
import { MetadataDefaultRepository } from "../data/repositories/MetadataDefaultRepository";
import { Instance } from "../data/entities/Instance";

dotenv.config();
console.log("Base URL:", process.env.REACT_APP_DHIS2_BASE_URL);
console.log("Auth:", process.env.REACT_APP_DHIS2_AUTH);

let metadataRepository: MetadataDefaultRepository;
let instance: Instance;

async function getOrgUnitIdFromCode(orgUnitCode: string) {
    const orgUnits = await metadataRepository
        .getOrgUnitsByCode([orgUnitCode])
        .toPromise()
        .catch(error => {
            console.error(`Error thrown when fetching all orgUnits, error : ${error}`);
            throw error;
        });

    return orgUnits.find(ou => ou.code === orgUnitCode)?.id || "";
}

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Show DHIS2 instance info",
        args: {
            filePath: option({
                type: string,
                long: "file",
                description: "The CSV file path containing orgUnitId, period, and batchId",
            }),
        },
        handler: async args => {
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

            instance = getInstance(envVars);
            metadataRepository = new MetadataDefaultRepository(instance);
            const api = getD2ApiFromArgs(envVars);

            const filePath = args.filePath;

            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }

            const aggregatedDataValues: any[] = [];

            const csvData = fs.readFileSync(filePath, "utf8").trim();

            if (!csvData) {
                throw new Error("CSV file is empty.");
            }

            const lines = csvData.split("\n");

            if (lines.length === 0 || !lines[0]) {
                throw new Error("No header found in CSV file.");
            }

            const header = lines[0].split(",").map(h => h.trim());

            const orgUnitIndex = header.indexOf("Country");
            const periodIndex = header.indexOf("Year");
            const batchIdIndex = header.indexOf("BatchId");
            const dataSetIdIndex = header.indexOf("DataSet");

            console.log("orgUnitIndex: ", orgUnitIndex);
            console.log("dataSetIdIndex: ", dataSetIdIndex);

            if (orgUnitIndex === -1 || periodIndex === -1 || batchIdIndex === -1) {
                throw new Error("CSV must contain 'Country Code', 'Year', and 'BatchId' columns");
            }

            // Iterate over each row in the CSV (skip header)
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line) continue; // skip empty rows

                const row = line.split(",").map(value => value.trim());
                if (row.length < header.length) continue;

                const value = row[orgUnitIndex];
                if (!value) {
                    console.warn(`Missing Country value in row ${i}`);
                    continue;
                }
                const orgUnitId = await getOrgUnitIdFromCode(value);

                //const orgUnitId = await getOrgUnitIdFromCode(row[orgUnitIndex]);
                const period = row[periodIndex];
                const batchId = row[batchIdIndex];
                const dataSet = row[dataSetIdIndex];

                // Run the data reset operation for each row
                console.debug(
                    `Run AMR AGG RIS data reset for URL ${envVars.url} and period ${period} and orgUnit ${orgUnitId} and batchId ${batchId}`
                );

                let dataSetId;
                if (dataSet === "RIS") {
                    dataSetId = "CeQPmXgrhHF";
                } else if (dataSet === "SAMPLE") {
                    dataSetId = "OcAB7oaC072";
                } else {
                    throw new Error("DataSet is not recognized. It needs to be either RIS or SAMPLE");
                }

                try {
                    // Fetch all category combination values for the given batchId
                    console.debug(`Fetching all category combination options containing batch id : ${batchId}`);
                    const batchCC = await api.models.categoryOptionCombos
                        .get({
                            fields: { id: true, name: true },
                            filter: { identifiable: { token: batchId } },
                            paging: false,
                        })
                        .getData()
                        .catch(error => {
                            console.error(
                                `Error thrown when fetching category option combos for batchId : ${batchId}, error : ${error}`
                            );
                            throw error;
                        });

                    console.debug(
                        `Fetching data values for AMR RIS data set for country ${orgUnitId} and period ${period}`
                    );
                    if (!period) continue;
                    const dataSetValues = await api.dataValues
                        .getSet({
                            dataSet: [dataSetId],
                            orgUnit: [orgUnitId],
                            period: [period],
                        })
                        .getData()
                        .catch(error => {
                            console.error(
                                `Error thrown when fetching data values for AMR RIS data set for country ${orgUnitId} and period ${period}, error : ${error}`
                            );
                            throw error;
                        });

                    const filteredDataValues = dataSetValues.dataValues.filter(dv =>
                        batchCC.objects.map(coc => coc.id).includes(dv.attributeOptionCombo)
                    );

                    if (filteredDataValues.length === 0)
                        throw new Error(
                            `No data values found for period ${period}, org unit ${orgUnitId} and batchId ${batchId}`
                        );

                    console.debug(
                        `${filteredDataValues.length} data values found for period ${period}, org unit ${orgUnitId} and batchId ${batchId}`
                    );
                    const updatedDataValuesAggregate = filteredDataValues.map(dataValue => {
                        return {
                            ...dataValue,
                            value: "", // Clear values as part of reset
                        };
                    });

                    aggregatedDataValues.push(...updatedDataValuesAggregate);

                    const updatedDataValues = {
                        dataValues: filteredDataValues.map(dataValue => {
                            return {
                                ...dataValue,
                                value: "",
                            };
                        }),
                    };

                    const updateJson = JSON.stringify(updatedDataValues, null, 2);
                    fs.writeFileSync(
                        `AMR_AGG_reset_${row[orgUnitIndex]}_${period}_${batchId}_${dataSet}.json`,
                        updateJson
                    );
                } catch (error) {
                    console.error(
                        `Error thrown when resetting AMR AGG ${dataSet} data for country ${row[orgUnitIndex]}: ${error}`
                    );
                }
            }
            const finalJson = {
                dataValues: aggregatedDataValues,
            };

            // Write the aggregated data to a final JSON file
            const finalFileName = `AMR_AGG_reset_aggregated_${Date.now}.json`;
            fs.writeFileSync(finalFileName, JSON.stringify(finalJson, null, 2));

            console.log(`Aggregated data written to ${finalFileName}`);
        },
    });

    run(cmd, process.argv.slice(2));
}

main();

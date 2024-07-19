import { command, run, string, option } from "cmd-ts";
import path from "path";
import fs from "fs";
import { getD2ApiFromArgs } from "./common";

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Show DHIS2 instance info",
        args: {
            orgUnitId: option({
                type: string,
                long: "orgUnit",
                description: "The org unit id to run amr-agg data reset for",
            }),
            period: option({
                type: string,
                long: "period",
                description: "The period to run amr-agg data reset for",
            }),
            batchId: option({
                type: string,
                long: "batchId",
                description: "The batchId/dataset to run amr-agg data reset for",
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
            const api = getD2ApiFromArgs(envVars);

            //1. Get Period for which to reset.
            if (!args.period) throw new Error("Period is required");
            const period = args.period;

            //2. Get OrgUnit for which to reset.
            if (!args.orgUnitId) throw new Error("OrgUnit is required");
            const orgUnitId = args.orgUnitId;

            //3. Get Batch Id to reset
            if (!args.orgUnitId) throw new Error("OrgUnit is required");
            const batchId = args.batchId;

            //4. Set AMR-AGG dataset id.
            const dataSetId = "OcAB7oaC072";

            try {
                //5.Get all category combination values for given batchId
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

                //4. Get all data values for given country and period.
                console.debug(
                    `Fetching data values for AMR SAMPLE data set for country ${orgUnitId} and period ${period}`
                );
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
                //4.b) Filter data values for given batchId
                const filteredDataValues = dataSetValues.dataValues.filter(dv =>
                    batchCC.objects.map(coc => coc.id).includes(dv.attributeOptionCombo)
                );

                if (filteredDataValues.length === 0)
                    throw new Error(
                        `No data values found for period ${period},  org unit ${orgUnitId} and batchId ${batchId}`
                    );

                console.debug(
                    `${filteredDataValues.length} data values found for period ${period}, org unit ${orgUnitId} and batchId ${batchId}`
                );

                const updatedDataValues = {
                    dataValues: filteredDataValues.map(dataValue => {
                        return {
                            ...dataValue,
                            value: "",
                        };
                    }),
                };

                //5.  Create a json object with data values for given country and period with empty values
                const updateJson = JSON.stringify(updatedDataValues, null, 2);
                fs.writeFileSync(`AMR_AGG_reset_${orgUnitId}_${period}_${batchId}_SAMPLE.json`, updateJson);
            } catch (error) {
                console.error(`Error thrown when resetting AMR AGG Sample data: ${error}`);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

main();

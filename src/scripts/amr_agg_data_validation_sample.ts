import { command, option, optional, run, string } from "cmd-ts";
import path from "path";
import _ from "lodash";
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { getD2ApiFromArgs, getInstance } from "./common";
import { DataStoreKeys } from "../data/data-store/DataStoreKeys";
import { GlassUploads } from "../domain/entities/GlassUploads";

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Show DHIS2 instance info",
        args: {
            period: option({
                type: optional(string),
                long: "period",
                description: "The period to run amr-agg data validation for",
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
            const instance = getInstance(envVars);
            const dataStoreClient = new DataStoreClient(instance);

            //1. Initialize all periods
            const periods = args.period ? [args.period] : ["2022", "2023"];

            console.debug(`Run AMR AGG SAMPLE data validation for URL ${envVars.url} and periods ${periods}`);

            try {
                //2. Get all countries i.e org units of level 3.
                console.debug(`Fetching all countries i.e. orgunits of level 3`);

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

                //3. Initialize all bacth Ids
                const batchIds = ["DS1", "DS2", "DS3", "DS4", "DS5", "DS6"];

                //4. Get all data values for all countries and all periods
                console.debug(`Fetching all data values for AMR SAMPLE data set for all countries and periods`);
                const dataSetValues = await api.dataValues
                    .getSet({
                        dataSet: ["OcAB7oaC072"],
                        orgUnit: orgUnits.objects.map(ou => ou.id),
                        period: periods,
                    })
                    .getData()
                    .catch(error => {
                        console.error(`Error thrown when fetching data values for AMR SAMPLE data set : ${error}`);
                        throw error;
                    });

                //5. Get all category option combos for containing all batchIds
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

                console.debug(`Fetching all datastore values for SAMPLE Uploads`);
                const allUploads = await dataStoreClient
                    .listCollection<GlassUploads>(DataStoreKeys.UPLOADS)
                    .toPromise()
                    .catch(error => {
                        console.error(`Error thrown when fetching all uploads, error : ${error}`);
                        throw error;
                    });

                //6. Group data values by orgUnit
                const ouGroupedDataValues = _(dataSetValues.dataValues).groupBy("orgUnit");
                const formattedResult = await Promise.all(
                    ouGroupedDataValues
                        .map(async (dataValues, orgUnitKey) => {
                            //7. Group data values by period
                            const periodGroupedDataValues = _(dataValues).groupBy("period");
                            const result = periodGroupedDataValues.flatMap(async (dataValues, periodKey) => {
                                const country = orgUnits.objects.find(ou => ou.id === orgUnitKey)?.name;

                                const dataValuesByBatch = batchIds.map(async batchId => {
                                    //8. Get upload for period, OU and batchId
                                    const upload = allUploads.filter(
                                        upload =>
                                            upload.module === "AVnpk4xiXGG" &&
                                            upload.orgUnit === orgUnitKey &&
                                            upload.period === periodKey &&
                                            upload.batchId === batchId &&
                                            upload.fileType === "SAMPLE"
                                    );

                                    const currentBatchCC = allBatchIdCategoryCombos.filter(
                                        cc => cc.batchId === batchId
                                    );

                                    //9. Filter data values by batch id
                                    const dataValuesByBatchId = dataValues.filter(dv =>
                                        currentBatchCC
                                            .map(cbcc => cbcc.categoryComboId)
                                            .includes(dv.attributeOptionCombo)
                                    );

                                    return {
                                        dataCount: dataValuesByBatchId.length,
                                        period: periodKey,
                                        country: country,
                                        orgUnitId: orgUnitKey,
                                        batchId: batchId,
                                        uploadStatuses: upload.map(u => u.status),
                                        fileType: upload.map(u => u.fileType),
                                    };
                                });

                                return await Promise.all(dataValuesByBatch);
                            });
                            return await Promise.all(result.value());
                        })
                        .value()
                );

                const allAmrAggData = formattedResult.flat().flat();

                //10. Filter only corrupted data
                const corruptedAmrData = allAmrAggData.filter(
                    data =>
                        data.dataCount > 0 &&
                        !data.uploadStatuses.includes("COMPLETED") &&
                        !data.uploadStatuses.includes("VALIDATED")
                );
                console.debug(`All uploads with data corruption : ${JSON.stringify(corruptedAmrData, null, 2)}`);
            } catch (error) {
                console.error(`Error thrown when validating AMR AGG Sample data: ${error}`);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

main();

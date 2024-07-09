import { command, option, optional, run, string } from "cmd-ts";
import path from "path";
import _ from "lodash";
import { DataStoreClient } from "../data/data-store/DataStoreClient";
import { getApiUrlOptions, getD2ApiFromArgs, getInstance } from "./common";
import { DataStoreKeys } from "../data/data-store/DataStoreKeys";
import { GlassUploads } from "../domain/entities/GlassUploads";

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Show DHIS2 instance info",
        args: {
            ...getApiUrlOptions(),
            period: option({
                type: optional(string),
                long: "period",
                description: "The period to run amr-agg data validation for",
            }),
        },
        handler: async args => {
            const api = getD2ApiFromArgs(args);
            const instance = getInstance(args);
            const dataStoreClient = new DataStoreClient(instance);

            //1. Initialize all periods
            const periods = args.period ? [args.period] : ["2022", "2023"];

            console.debug(`Run AMR AGG SAMPLE data validation for URL ${args.url} and periods ${periods}`);

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
                                    //8. Get uploads for period, OU and batchId from datastore

                                    const upload = await dataStoreClient
                                        .getObjectsFilteredByProps<GlassUploads>(
                                            DataStoreKeys.UPLOADS,
                                            new Map<keyof GlassUploads, unknown>([
                                                ["module", "AVnpk4xiXGG"],
                                                ["orgUnit", orgUnitKey],
                                                ["period", periodKey],
                                                ["batchId", batchId],
                                                ["fileType", "SAMPLE"],
                                            ])
                                        )
                                        .toPromise()
                                        .catch(error => {
                                            console.error(
                                                `Error thrown when fetching uploads for period : ${periodKey}, OU : ${orgUnitKey}, batchId : ${batchId}, error : ${error}`
                                            );
                                            throw error;
                                        });

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

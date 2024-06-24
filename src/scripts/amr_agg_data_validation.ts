import { command, run } from "cmd-ts";
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
        },
        handler: async args => {
            const api = getD2ApiFromArgs(args);
            const instance = getInstance(args);
            const dataStoreClient = new DataStoreClient(instance);

            //1. Initialize all periods
            const periods = ["2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023"];

            //2. Get all countries i.e org units of level 3.
            const orgUnits = await api.models.organisationUnits
                .get({
                    fields: { id: true, name: true, code: true },
                    filter: { level: { eq: "3" } },
                    paging: false,
                })
                .getData();
            //Add Kosovo to the list of countries
            orgUnits.objects.push({
                id: "I8AMbKhxlj9",
                name: "Kosovo",
                code: "601624",
            });

            //3. Get all data values for all countries and all periods
            const dataSetValues = await api.dataValues
                .getSet({
                    dataSet: ["CeQPmXgrhHF"],
                    orgUnit: orgUnits.objects.map(ou => ou.id),
                    period: periods,
                })
                .getData();

            const ouGroupedDataValues = _(dataSetValues.dataValues).groupBy("orgUnit");
            const formattedResult = await Promise.all(
                ouGroupedDataValues
                    .map(async (dataValues, orgUnitKey) => {
                        const periodGroupedDataValues = _(dataValues).groupBy("period");
                        const result = periodGroupedDataValues.map(async (dataValues, periodKey) => {
                            const country = orgUnits.objects.find(ou => ou.id === orgUnitKey)?.name;
                            //4. Get uploads for period and OU from datastore
                            const upload = await dataStoreClient
                                .getObjectsFilteredByProps<GlassUploads>(
                                    DataStoreKeys.UPLOADS,
                                    new Map<keyof GlassUploads, unknown>([
                                        ["module", "AVnpk4xiXGG"],
                                        ["orgUnit", orgUnitKey],
                                        ["period", periodKey],
                                    ])
                                )
                                .toPromise();

                            if (upload.length === 0)
                                console.debug(`ERROR: No upload found for period ${periodKey} and Country ${country}`);

                            return {
                                dataCount: dataValues.length,
                                period: periodKey,
                                country: country,
                                orgUnitId: orgUnitKey,
                                uploadStatuses: upload.map(u => u.status),
                            };
                        });
                        return await Promise.all(result.value());
                    })
                    .value()
            );

            const allAmrAggData = formattedResult.flat();

            //5. Filter only corrupted data
            const corruptedAmrData = allAmrAggData.filter(
                data =>
                    data.dataCount > 0 &&
                    !data.uploadStatuses.includes("COMPLETED") &&
                    !data.uploadStatuses.includes("VALIDATED")
            );
            console.debug(`All uploads with data corruption : ${JSON.stringify(corruptedAmrData, null, 2)}`);
        },
    });

    run(cmd, process.argv.slice(2));
}

main();

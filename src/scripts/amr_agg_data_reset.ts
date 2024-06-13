import { command, run, string, option } from "cmd-ts";
import path from "path";
import { D2Api } from "../types/d2-api";
import fs from "fs";

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Show DHIS2 instance info",
        args: {
            url: option({
                type: string,
                long: "dhis2-url",
                short: "u",
                description: "DHIS2 base URL. Example: http://USERNAME:PASSWORD@localhost:8080",
            }),
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
        },
        handler: async args => {
            const api = new D2Api({ baseUrl: args.url });

            //1. Get Period for which to reset.
            if (!args.period) throw new Error("Period is required");
            const period = args.period;

            //2. Get OrgUnit for which to reset.
            if (!args.orgUnitId) throw new Error("OrgUnit is required");
            const orgUnitId = args.orgUnitId;

            //3. Set AMR-AGG dataset id.
            const dataSetId = "CeQPmXgrhHF";

            //4. Get all data values for given country and period.
            const dataSetValues = await api.dataValues
                .getSet({
                    dataSet: [dataSetId],
                    orgUnit: [orgUnitId],
                    period: [period],
                })
                .getData();

            if (dataSetValues.dataValues.length === 0)
                throw new Error(`No data values found for period ${period} and org unit ${orgUnitId}`);

            console.debug(
                `${dataSetValues.dataValues.length} data values found for period ${period} and org unit ${orgUnitId}`
            );

            const updatedDataValues = {
                dataValues: dataSetValues.dataValues.map(dataValue => {
                    return {
                        ...dataValue,
                        value: "",
                    };
                }),
            };

            //5.  Create a json object with data values for given country and period with empty values
            const updateJson = JSON.stringify(updatedDataValues, null, 2);
            fs.writeFileSync(`AMR_AGG_reset_${orgUnitId}_${period}.json`, updateJson);
        },
    });

    run(cmd, process.argv.slice(2));
}

main();

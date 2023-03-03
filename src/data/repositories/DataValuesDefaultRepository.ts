import { D2Api } from "@eyeseetea/d2-api/2.34";
import { FutureData } from "../../domain/entities/Future";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { Instance } from "../entities/Instance";
import { DataValue } from "../../domain/entities/data-entry/DataValue";
import { DataValuesSaveSummary } from "../../domain/entities/data-entry/DataValuesSaveSummary";
import { DataValuesRepository } from "../../domain/repositories/data-entry/DataValuesRepository";

export class DataValuesDefaultRepository implements DataValuesRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    save(dataValues: DataValue[]): FutureData<DataValuesSaveSummary> {
        // We use async way because sync throw timeouts
        //return apiToFuture(this.api.dataValues.postSet({ importStrategy: "CREATE_AND_UPDATE" }, { dataValues }));

        return apiToFuture(
            this.api.dataValues.postSetAsync(
                {
                    importStrategy: "CREATE_AND_UPDATE",
                },
                { dataValues }
            )
        )
            .flatMap(response => {
                return apiToFuture(this.api.system.waitFor(response.response.jobType, response.response.id));
            })
            .map(result => {
                if (!result) {
                    return {
                        status: "ERROR",
                        description: "An unexpected error has ocurred saving data values",
                        importCount: {
                            imported: 0,
                            updated: 0,
                            ignored: 0,
                            deleted: 0,
                        },
                        conficts: [],
                    };
                }

                return result;
            });
    }
}

import { getD2APiFromInstance } from "../../utils/d2-api";
import { Instance } from "../entities/Instance";
import { FutureData } from "../../domain/entities/Future";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { TrackerRepository } from "../../domain/repositories/TrackerRepository";
import { ImportStrategy } from "../../domain/entities/data-entry/DataValuesSaveSummary";
import { apiToFuture } from "../../utils/futures";
import { TrackerPostRequest, TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { trackerPostResponseDefaultError } from "./utils/TrackerPostResponseDefaultError";

export class TrackerDefaultRepository implements TrackerRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    import(req: TrackerPostRequest, action: ImportStrategy): FutureData<TrackerPostResponse> {
        return apiToFuture(
            this.api.tracker.postAsync(
                {
                    importStrategy: action,
                },
                req
            )
        ).flatMap(response => {
            console.debug(response.response.jobType);
            return apiToFuture(this.api.system.waitFor("TRACKER_IMPORT_JOB", response.response.id)).map(result => {
                if (result) return result;
                else {
                    return trackerPostResponseDefaultError;
                }
            });
        });
    }

    public getProgramMetadata(programID: string, programStageId: string): FutureData<any> {
        return apiToFuture(
            this.api.models.programs.get({
                fields: {
                    id: true,
                    programStages: {
                        id: true,
                        name: true,
                        programStageDataElements: {
                            dataElement: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                    programTrackedEntityAttributes: {
                        trackedEntityAttribute: {
                            id: true,
                            name: true,
                            code: true,
                            valueType: true,
                            optionSetValue: true,
                            optionSet: { options: { name: true, code: true } },
                        },
                    },
                },
                filter: { id: { eq: programID } },
            })
        ).map(response => {
            const programStage = response.objects[0]?.programStages.find(ps => ps.id === programStageId);
            return {
                programAttributes: response.objects[0]?.programTrackedEntityAttributes.map(
                    atr => atr.trackedEntityAttribute
                ),
                programStageDataElements: programStage?.programStageDataElements.map(de => de.dataElement),
            };
        });
    }
}

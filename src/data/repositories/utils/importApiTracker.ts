import { apiToFuture } from "../../../utils/futures";
import { TrackerPostRequest, TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { ImportStrategy } from "../../../domain/entities/data-entry/DataValuesSaveSummary";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { trackerPostResponseDefaultError } from "./TrackerPostResponseDefaultError";
import { FutureData } from "../../../domain/entities/Future";

export function importApiTracker(
    api: D2Api,
    request: TrackerPostRequest,
    action: ImportStrategy
): FutureData<TrackerPostResponse> {
    return apiToFuture(
        api.tracker.postAsync(
            {
                importStrategy: action,
                skipRuleEngine: true,
            },
            request
        )
    ).flatMap(response => {
        console.debug(response.response.jobType);
        return apiToFuture(api.system.waitFor("TRACKER_IMPORT_JOB", response.response.id)).map(result => {
            if (result) return result;
            else {
                return trackerPostResponseDefaultError;
            }
        });
    });
}

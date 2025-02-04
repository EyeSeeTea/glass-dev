import { apiToFuture } from "../../../utils/futures";
import { TrackerPostRequest as D2TrackerPostRequest, TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { ImportStrategy } from "../../../domain/entities/data-entry/DataValuesSaveSummary";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { trackerPostResponseDefaultError } from "./TrackerPostResponseDefaultError";
import { FutureData } from "../../../domain/entities/Future";
import {
    TrackerEnrollment,
    TrackerEvent,
    TrackerPostRequest,
    TrackerTrackedEntity,
} from "../../../domain/entities/TrackedEntityInstance";
import { D2TrackerEventToPost } from "@eyeseetea/d2-api/api/trackerEvents";
import { D2TrackerEnrollmentToPost } from "@eyeseetea/d2-api/api/trackerEnrollments";
import { D2TrackedEntityInstanceToPost } from "@eyeseetea/d2-api/api/trackerTrackedEntities";

export function importApiTracker(
    api: D2Api,
    request: D2TrackerPostRequest,
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
        console.debug(response.response);
        return apiToFuture(api.system.waitFor("TRACKER_IMPORT_JOB", response.response.id)).map(result => {
            if (result) return result;
            else {
                return trackerPostResponseDefaultError;
            }
        });
    });
}

export function mapTrackerPostRequestToD2TrackerPostRequest(
    trackerPostRequest: TrackerPostRequest
): D2TrackerPostRequest {
    return {
        trackedEntities: mapTrackerTrackedEntitiesToD2TrackerEnrollmentsToPost(
            trackerPostRequest.trackedEntities || []
        ),
        enrollments: mapTrackerEnrollmentsToD2TrackerEnrollmentsToPost(trackerPostRequest.enrollments || []),
        events: mapTrackerEventsToD2TrackerEventsToPost(trackerPostRequest.events || []),
    };
}

function mapTrackerTrackedEntitiesToD2TrackerEnrollmentsToPost(
    trackerTrackedEntities: TrackerTrackedEntity[]
): D2TrackedEntityInstanceToPost[] {
    return trackerTrackedEntities.map(trackedEntity => ({
        ...trackedEntity,
        enrollments: mapTrackerEnrollmentsToD2TrackerEnrollmentsToPost(trackedEntity.enrollments || []),
    }));
}

function mapTrackerEnrollmentsToD2TrackerEnrollmentsToPost(
    trackerEnrollments: TrackerEnrollment[]
): D2TrackerEnrollmentToPost[] {
    return trackerEnrollments?.map(enrollment => ({
        ...enrollment,
        events: mapTrackerEventsToD2TrackerEventsToPost(enrollment.events || []),
    }));
}

function mapTrackerEventsToD2TrackerEventsToPost(trackerEvents: TrackerEvent[]): D2TrackerEventToPost[] {
    return trackerEvents?.map(event => ({
        ...event,
    }));
}

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
import { D2TrackerEnrollment, D2TrackerEnrollmentToPost } from "@eyeseetea/d2-api/api/trackerEnrollments";
import { D2TrackedEntityInstanceToPost } from "@eyeseetea/d2-api/api/trackerTrackedEntities";

export function importApiTracker(
    api: D2Api,
    request: TrackerPostRequest,
    action: ImportStrategy
): FutureData<TrackerPostResponse> {
    const d2Request = mapTrackerPostRequestToD2TrackerPostRequest(request);
    return d2ImportApiTracker(api, d2Request, action);
}

export function d2ImportApiTracker(
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
        relationships: [],
        attributes: trackedEntity.attributes || [],
        createdAtClient: trackedEntity.createdAtClient || "",
        orgUnit: trackedEntity.orgUnit || "",
        trackedEntity: trackedEntity.trackedEntity || "",
        trackedEntityType: trackedEntity.trackedEntityType || "",
        updatedAtClient: trackedEntity.updatedAtClient || "",
        enrollments: mapTrackerEnrollmentsToD2TrackerEnrollmentsToPost(
            trackedEntity.enrollments || []
        ) as D2TrackerEnrollment[], // TODO: Change this cast type when it is fixed in d2-api. It should be D2TrackerEnrollmentToPost[]
    }));
}

function mapTrackerEnrollmentsToD2TrackerEnrollmentsToPost(
    trackerEnrollments: TrackerEnrollment[]
): D2TrackerEnrollmentToPost[] {
    return trackerEnrollments?.map(enrollment => ({
        ...enrollment,
        enrolledAt: enrollment.enrolledAt || "",
        createdAtClient: enrollment.createdAtClient || "",
        updatedAtClient: enrollment.updatedAtClient || "",
        program: enrollment.program || "",
        programStage: enrollment.programStage || "",
        enrollmentDate: enrollment.enrollmentDate || "",
        incidentDate: enrollment.incidentDate || "",
        createdAt: enrollment.createdAt || "",
        events: mapTrackerEventsToD2TrackerEventsToPost(enrollment.events || []),
    }));
}

function mapTrackerEventsToD2TrackerEventsToPost(trackerEvents: TrackerEvent[]): D2TrackerEventToPost[] {
    return trackerEvents?.map(event => ({
        ...event,
        program: event.program || "",
        programStage: event.programStage || "",
        scheduledAt: event.scheduledAt || "",
        createdAt: event.createdAt || "",
    }));
}

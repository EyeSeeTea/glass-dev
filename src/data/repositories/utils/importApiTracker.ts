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

const defaultStats = {
    created: 0,
    updated: 0,
    ignored: 0,
    deleted: 0,
    total: 0,
};

const defaultTrackerPostResponse: TrackerPostResponse = {
    status: "OK",
    validationReport: {
        errorReports: [],
        warningReports: [],
    },
    stats: defaultStats,
    bundleReport: {
        status: "OK",
        typeReportMap: {
            ENROLLMENT: {
                trackerType: "ENROLLMENT",
                stats: defaultStats,
                objectReports: [],
            },
            TRACKED_ENTITY: {
                trackerType: "TRACKED_ENTITY",
                stats: defaultStats,
                objectReports: [],
            },
            RELATIONSHIP: {
                trackerType: "RELATIONSHIP",
                stats: defaultStats,
                objectReports: [],
            },
            EVENT: {
                trackerType: "EVENT",
                stats: defaultStats,
                objectReports: [],
            },
        },
        stats: defaultStats,
    },
    timingsStats: {},
    message: "",
};

export function getDefaultErrorTrackerPostResponse(errorMessage: string): TrackerPostResponse {
    return {
        ...defaultTrackerPostResponse,
        status: "ERROR",
        message: errorMessage,
    };
}

function sumStats(...items: Array<Partial<TrackerPostResponse["stats"]> | undefined>): TrackerPostResponse["stats"] {
    return items.reduce<TrackerPostResponse["stats"]>(
        (acc, stat = {}) => ({
            created: acc.created + (stat.created ?? 0),
            updated: acc.updated + (stat.updated ?? 0),
            ignored: acc.ignored + (stat.ignored ?? 0),
            deleted: acc.deleted + (stat.deleted ?? 0),
            total: acc.total + (stat.total ?? 0),
        }),
        { created: 0, updated: 0, ignored: 0, deleted: 0, total: 0 }
    );
}

export function joinAllTrackerPostResponses(responses: TrackerPostResponse[]): TrackerPostResponse {
    return responses.reduce((acc: TrackerPostResponse, response: TrackerPostResponse): TrackerPostResponse => {
        const message = [acc.message, response.message].filter(Boolean).join(" | ");

        return {
            status: response.status === "ERROR" ? "ERROR" : acc.status,
            validationReport: {
                errorReports: [
                    ...(acc.validationReport?.errorReports ?? []),
                    ...(response.validationReport?.errorReports ?? []),
                ],
                warningReports: [
                    ...(acc.validationReport?.warningReports ?? []),
                    ...(response.validationReport?.warningReports ?? []),
                ],
            },
            stats: sumStats(acc.stats, response.stats),
            bundleReport: {
                status: "OK",
                typeReportMap: {
                    ENROLLMENT: {
                        trackerType: "ENROLLMENT",
                        stats: sumStats(
                            acc.bundleReport?.typeReportMap?.ENROLLMENT?.stats,
                            response.bundleReport?.typeReportMap?.ENROLLMENT?.stats
                        ),
                        objectReports: [
                            ...(acc.bundleReport?.typeReportMap?.ENROLLMENT?.objectReports ?? []),
                            ...(response.bundleReport?.typeReportMap?.ENROLLMENT?.objectReports ?? []),
                        ],
                    },
                    TRACKED_ENTITY: {
                        trackerType: "TRACKED_ENTITY",
                        stats: sumStats(
                            acc.bundleReport?.typeReportMap?.TRACKED_ENTITY?.stats,
                            response.bundleReport?.typeReportMap?.TRACKED_ENTITY?.stats
                        ),
                        objectReports: [
                            ...(acc.bundleReport?.typeReportMap?.TRACKED_ENTITY?.objectReports ?? []),
                            ...(response.bundleReport?.typeReportMap?.TRACKED_ENTITY?.objectReports ?? []),
                        ],
                    },
                    RELATIONSHIP: {
                        trackerType: "RELATIONSHIP",
                        stats: sumStats(
                            acc.bundleReport?.typeReportMap?.RELATIONSHIP?.stats,
                            response.bundleReport?.typeReportMap?.RELATIONSHIP?.stats
                        ),
                        objectReports: [
                            ...(acc.bundleReport?.typeReportMap?.RELATIONSHIP?.objectReports ?? []),
                            ...(response.bundleReport?.typeReportMap?.RELATIONSHIP?.objectReports ?? []),
                        ],
                    },
                    EVENT: {
                        trackerType: "EVENT",
                        stats: sumStats(
                            acc.bundleReport?.typeReportMap?.EVENT?.stats,
                            response.bundleReport?.typeReportMap?.EVENT?.stats
                        ),
                        objectReports: [
                            ...(acc.bundleReport?.typeReportMap?.EVENT?.objectReports ?? []),
                            ...(response.bundleReport?.typeReportMap?.EVENT?.objectReports ?? []),
                        ],
                    },
                },
                stats: sumStats(acc.bundleReport?.stats, response.bundleReport?.stats),
            },
            timingsStats: { ...(acc.timingsStats ?? {}), ...(response.timingsStats ?? {}) },
            message: message,
        };
    }, defaultTrackerPostResponse);
}

import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";

export const trackerPostResponseDefaultError: TrackerPostResponse = {
    status: "ERROR",
    validationReport: {
        errorReports: [
            {
                message: "An unexpected error occured when importing tracker",
                errorCode: "",
                trackerType: "",
                uid: "",
            },
        ],
        warningReports: [],
    },
    stats: {
        created: 0,
        updated: 0,
        deleted: 0,
        ignored: 0,
        total: 0,
    },
    bundleReport: {
        status: "OK",
        typeReportMap: {
            ENROLLMENT: {
                trackerType: "ENROLLMENT",
                stats: {
                    created: 0,
                    updated: 0,
                    deleted: 0,
                    ignored: 0,
                    total: 0,
                },
                objectReports: [],
            },
            TRACKED_ENTITY: {
                trackerType: "TRACKED_ENTITY",
                stats: {
                    created: 0,
                    updated: 0,
                    deleted: 0,
                    ignored: 0,
                    total: 0,
                },
                objectReports: [],
            },
            RELATIONSHIP: {
                trackerType: "RELATIONSHIP",
                stats: {
                    created: 0,
                    updated: 0,
                    deleted: 0,
                    ignored: 0,
                    total: 0,
                },
                objectReports: [],
            },
            EVENT: {
                trackerType: "EVENT",
                stats: {
                    created: 0,
                    updated: 0,
                    deleted: 0,
                    ignored: 0,
                    total: 0,
                },
                objectReports: [],
            },
        },
        stats: {
            created: 0,
            updated: 0,
            deleted: 0,
            ignored: 0,
            total: 0,
        },
    },
    timingsStats: {},
    message: "",
};

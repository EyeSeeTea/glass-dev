import { D2Api } from "@eyeseetea/d2-api/2.34";
import { getMockApiFromClass } from "@eyeseetea/d2-api";
export type {
    D2TrackerTrackedEntitySchema,
    D2TrackerTrackedEntity,
    TrackedPager,
} from "@eyeseetea/d2-api/api/trackerTrackedEntities";
export type {
    D2TrackerEventSchema,
    TrackerEventsResponse,
    DataValue,
    D2TrackerEventToPost,
} from "@eyeseetea/d2-api/api/trackerEvents";
export type { AttributeToPost, D2TrackedEntityInstanceToPost } from "@eyeseetea/d2-api/api/trackerTrackedEntities";
export type { D2TrackerEnrollmentToPost } from "@eyeseetea/d2-api/api/trackerEnrollments";

export * from "@eyeseetea/d2-api/2.34";
export const getMockApi = getMockApiFromClass(D2Api);

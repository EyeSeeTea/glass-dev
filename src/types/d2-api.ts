import { D2Api } from "@eyeseetea/d2-api/2.34";
import { getMockApiFromClass } from "@eyeseetea/d2-api";
export type {
    D2TrackerTrackedEntitySchema,
    D2TrackerTrackedEntity,
} from "@eyeseetea/d2-api/api/trackerTrackedEntities";
export type { AttributeToPost, D2TrackedEntityInstanceToPost } from "@eyeseetea/d2-api/api/trackerTrackedEntities";
export type { D2TrackerEnrollmentToPost } from "@eyeseetea/d2-api/api/trackerEnrollments";

export * from "@eyeseetea/d2-api/2.34";
export const getMockApi = getMockApiFromClass(D2Api);

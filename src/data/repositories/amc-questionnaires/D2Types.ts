import { D2TrackerEventSchema } from "@eyeseetea/d2-api/api/trackerEvents";
import { SelectedPick, D2TrackerTrackedEntitySchema } from "../../../types/d2-api";

export const trackedEntitiesFields = {
    orgUnit: true,
    trackedEntity: true,
    updatedAt: true,
    createdAt: true,
    enrollments: {
        enrollment: true,
        status: true,
        enrolledAt: true,
        occurredAt: true,
        events: {
            enrollment: true,
            event: true,
            occurredAt: true,
            orgUnit: true,
            program: true,
            programStage: true,
            dataValues: {
                dataElement: true,
                value: true,
            },
        },
    },
    attributes: true,
} as const;

export type D2TrackedEntity = SelectedPick<D2TrackerTrackedEntitySchema, typeof trackedEntitiesFields>;

export const dataElementFields = {
    id: true,
    code: true,
    name: true,
} as const;

export const eventFields = {
    dataValues: {
        dataElement: dataElementFields,
        value: true,
    },
    trackedEntity: true,
    event: true,
    updatedAt: true,
} as const;

export type D2Event = SelectedPick<D2TrackerEventSchema, typeof eventFields>;

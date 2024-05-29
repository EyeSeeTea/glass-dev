import { Id } from "../../Ref";

export type EventDataValue = {
    id: Id;
    value: string;
};

export type Event = {
    eventId: Id;
    occurredAt: string;
    dataValues: EventDataValue[];
};

export type Attributes = {
    id: Id;
    code: string;
    valueType: string;
    value: string;
};

export type ProductDataTrackedEntity = {
    trackedEntityId: Id;
    enrollmentId: Id;
    enrollmentStatus: Id;
    enrolledAt: string;
    events: Event[];
    attributes: Attributes[];
};

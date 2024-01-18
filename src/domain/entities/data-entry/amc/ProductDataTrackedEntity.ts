import { Id } from "../../Ref";

export type EventDataValue = {
    id: Id;
    value: string;
};

export type Event = {
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
    events: Event[];
    attributes: Attributes[];
};

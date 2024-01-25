export interface EventsPackage {
    events: Event[];
}

export interface Event {
    event?: string;
    orgUnit: string;
    program: string;
    status: string;
    eventDate: string;
    coordinate?: {
        latitude: number;
        longitude: number;
    };
    attributeOptionCombo?: string;
    trackedEntityInstance?: string;
    programStage?: string;
    dataValues: EventDataValue[];
}

export interface EventDataValue {
    dataElement: string;
    value: string | number | boolean;
}

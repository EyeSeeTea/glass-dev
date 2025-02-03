import _ from "lodash";
import { DataElementType } from "./DataForm";

import { Geometry } from "./Geometry";
import { Id, Ref } from "./Ref";
import { Relationship } from "./Relationship";

export interface TrackedEntityInstance {
    program: Ref;
    id: Id;
    orgUnit: Ref;
    disabled: boolean;
    attributeValues: AttributeValue[];
    enrollment: Enrollment | undefined;
    relationships: Relationship[];
    geometry: Geometry;
}

export interface Enrollment {
    id?: Id;
    enrollmentDate: string;
    incidentDate: string;
}

export interface AttributeValue {
    attribute: Attribute;
    value: string;
    optionId?: Id;
}

export interface Program {
    id: Id;
    trackedEntityType: Ref;
    attributes: Attribute[];
}

export interface Attribute {
    id: Id;
    valueType: DataElementType | undefined;
    optionSet?: { id: Id; options: Array<{ id: string; code: string }> };
}

export function getRelationships(trackedEntityInstances: TrackedEntityInstance[]): Relationship[] {
    return _(trackedEntityInstances)
        .flatMap(tei => tei.relationships)
        .uniqWith(_.isEqual)
        .value();
}

export function isRelationshipValid(relationship: Relationship): boolean {
    return !!(
        relationship &&
        (relationship.typeId || relationship.typeName) &&
        relationship.fromId &&
        relationship.toId
    );
}

// NOTICE: Workaround because the d2-api (DHIS2) tracker types have been coupled in the domain
// TODO: Fix the coupling with DHIS2 tracker types in the domain: map DHIS2 tracker types to domain types in the data layer and remove these.
type IsoDate = string;
type Username = string;

export type TrackerEventDataValue = { dataElement: Id; value: string };

export type TrackerEvent = {
    program: Id;
    programStage: Id;
    trackedEntity?: Id;
    orgUnit: Id;
    orgUnitName?: string;
    event: Id;
    enrollment?: Id;
    dataValues: TrackerEventDataValue[];
    occurredAt: IsoDate;
    status: "ACTIVE" | "COMPLETED" | "VISITED" | "SCHEDULE" | "OVERDUE" | "SKIPPED";
    attributeOptionCombo?: Id;
    scheduledAt?: IsoDate;
    createdAt?: IsoDate;
};

export type TrackerEnrollmentAttribute = {
    attribute: string;
    value: Date | string | number;
};

export type TrackerEnrollment = {
    orgUnit: Id;
    program: Id;
    enrollment: Id;
    trackedEntity: Id;
    trackedEntityType: Id;
    attributes: TrackerEnrollmentAttribute[];
    events: TrackerEvent[];
    enrolledAt: IsoDate;
    occurredAt: IsoDate;
    createdAt: IsoDate;
    createdAtClient: IsoDate;
    updatedAt: IsoDate;
    updatedAtClient: IsoDate;
    enrollmentDate?: IsoDate;
    incidentDate?: IsoDate;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED";
    orgUnitName: string;
    followUp: boolean;
    deleted: boolean;
    storedBy: Username;
    programStage?: Id;
};

export interface TrackerTrackedEntityAttribute {
    attribute: Id;
    value: string;
}

export type TrackerTrackedEntity = {
    trackedEntity: Id;
    trackedEntityType: Id;
    orgUnit: string;
    attributes: TrackerTrackedEntityAttribute[];
    enrollments: TrackerEnrollment[];
    createdAtClient?: IsoDate;
    updatedAtClient?: IsoDate;
};

export interface TrackerEventsPostRequest {
    events: TrackerEvent[];
}

export interface TrackerPostRequest {
    trackedEntities?: TrackerTrackedEntity[];
    enrollments?: TrackerEnrollment[];
    events?: TrackerEvent[];
}

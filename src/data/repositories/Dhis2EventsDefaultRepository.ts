import { getD2APiFromInstance } from "../../utils/d2-api";
import { Instance } from "../entities/Instance";
import { ImportStrategy } from "../../domain/entities/data-entry/DataValuesSaveSummary";
import { Future, FutureData } from "../../domain/entities/Future";
import { EGASP_PROGRAM_ID } from "./program-rule/ProgramRulesMetadataDefaultRepository";
import { D2TrackerEvent, TrackerEventsResponse } from "@eyeseetea/d2-api/api/trackerEvents";
import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { apiToFuture } from "../../utils/futures";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { NamedRef } from "../../domain/entities/Ref";

export declare type EventStatus = "ACTIVE" | "COMPLETED" | "VISITED" | "SCHEDULED" | "OVERDUE" | "SKIPPED";
export interface EventsPostRequest {
    events: Array<Event>;
}
export interface Event {
    event: string;
    orgUnit: string;
    program: string;
    status: EventStatus;
    eventDate: string;
    coordinate?: {
        latitude: number;
        longitude: number;
    };
    attributeOptionCombo?: string;
    trackedEntityInstance?: string;
    programStage?: string;
    dataValues: Array<{
        dataElement: string;
        value: string | number | boolean | NamedRef;
    }>;
}

export interface TrackerEventsPostRequest {
    events: D2TrackerEvent[];
}

export class Dhis2EventsDefaultRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    getEGASPEvents(orgUnit: string, page: number): Promise<TrackerEventsResponse> {
        return this.api.tracker.events
            .get({
                fields: { $owner: true },
                program: EGASP_PROGRAM_ID,
                orgUnit,
                totalPages: true,
                pageSize: 250,
                page,
            })
            .getData();
    }

    async getEGASPEventsByOrgUnitAsync(orgUnit: string): Promise<D2TrackerEvent[]> {
        const eventsByOU: D2TrackerEvent[] = [];
        let page = 1;
        let result;

        do {
            result = await this.getEGASPEvents(orgUnit, page);
            eventsByOU.push(...result.instances);
            page++;
        } while (result.page >= page);

        return eventsByOU;
    }

    getEGASPEventsByOrgUnit(orgUnit: string): FutureData<D2TrackerEvent[]> {
        return Future.fromPromise(this.getEGASPEventsByOrgUnitAsync(orgUnit));
    }

    import(events: TrackerEventsPostRequest, action: ImportStrategy): FutureData<TrackerPostResponse> {
        return apiToFuture(this.api.tracker.post({ importStrategy: action }, events));
    }
}

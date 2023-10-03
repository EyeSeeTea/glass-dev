import { getD2APiFromInstance } from "../../utils/d2-api";
import { Instance } from "../entities/Instance";
import { ImportStrategy } from "../../domain/entities/data-entry/DataValuesSaveSummary";
import { Future, FutureData } from "../../domain/entities/Future";
import { EGASP_PROGRAM_ID } from "./program-rule/ProgramRulesMetadataDefaultRepository";
import { D2TrackerEvent, TrackerEventsResponse } from "@eyeseetea/d2-api/api/trackerEvents";
import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { D2Api, Id } from "@eyeseetea/d2-api/2.34";
import { apiToFuture } from "../../utils/futures";

export declare type EventStatus = "ACTIVE" | "COMPLETED" | "VISITED" | "SCHEDULED" | "OVERDUE" | "SKIPPED";

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
                fields: { $owner: true, event: true, dataValues: true, orgUnit: true, occurredAt: true },
                program: EGASP_PROGRAM_ID,
                orgUnit,
                ouMode: "DESCENDANTS",
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
        return Future.fromPromise(
            this.api.tracker
                .post({ importStrategy: action }, events)
                .getData()
                .then(resp => {
                    return resp;
                })
                .catch(err => {
                    return err?.response?.data;
                })
        );
    }

    getEventById(id: Id): FutureData<D2TrackerEvent> {
        return apiToFuture(
            this.api.tracker.events.getById(id, {
                fields: {
                    $all: true,
                },
            })
        );
    }
}

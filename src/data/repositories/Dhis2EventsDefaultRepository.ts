import { getD2APiFromInstance } from "../../utils/d2-api";
import { Instance } from "../entities/Instance";
import { ImportStrategy } from "../../domain/entities/data-entry/DataValuesSaveSummary";
import { EventsPostResponse } from "@eyeseetea/d2-api/api/events";
import { Future, FutureData } from "../../domain/entities/Future";
import { HttpResponse } from "@eyeseetea/d2-api/api/common";
import { EGASP_PROGRAM_ID } from "./program-rule/ProgramRulesMetadataDefaultRepository";
import { D2Api, Pager } from "@eyeseetea/d2-api/2.34";

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
        value: string | number | boolean;
    }>;
}
interface PagedEventsApiResponse {
    pager: Pager;
    events: Event[];
}

export class Dhis2EventsDefaultRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    getEGASPEvents(orgUnit: string, page: number): Promise<PagedEventsApiResponse> {
        return this.api
            .get<PagedEventsApiResponse>("/events", {
                program: EGASP_PROGRAM_ID,
                orgUnit,
                paging: true,
                totalPages: true,
                pageSize: 250,
                page,
            })
            .getData();
    }

    async getEGASPEventsByOrgUnitAsync(orgUnit: string): Promise<Event[]> {
        const eventsByOU: Event[] = [];
        let page = 1;
        let result;

        do {
            result = await this.getEGASPEvents(orgUnit, page);
            eventsByOU.push(...result.events);
            page++;
        } while (result.pager.pageCount >= page);

        return eventsByOU;
    }

    getEGASPEventsByOrgUnit(orgUnit: string): FutureData<Event[]> {
        return Future.fromPromise(this.getEGASPEventsByOrgUnitAsync(orgUnit));
    }

    import(events: EventsPostRequest, action: ImportStrategy): FutureData<EventsPostResponse> {
        return Future.fromPromise(
            this.api
                .post<HttpResponse<EventsPostResponse>>("/events", { strategy: action }, events)
                .getData()
                .then(result => {
                    return result?.response;
                })
                .catch(error => {
                    if (error?.response?.data) return error.response.data.response;
                    else return error;
                })
        );
    }
}

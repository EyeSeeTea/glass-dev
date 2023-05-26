import { D2Api } from "@eyeseetea/d2-api/2.34";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { Instance } from "../entities/Instance";
import { ImportStrategy } from "../../domain/entities/data-entry/DataValuesSaveSummary";
import { EventsPostResponse } from "@eyeseetea/d2-api/api/events";
import { Future, FutureData } from "../../domain/entities/Future";
import { HttpResponse } from "@eyeseetea/d2-api/api/common";

export declare type EventStatus = "ACTIVE" | "COMPLETED" | "VISITED" | "SCHEDULED" | "OVERDUE" | "SKIPPED";
export interface EventsPostRequest {
    events: Array<Event>;
}

export interface Event {
    event?: string;
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

export class Dhis2EventsDefaultRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
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

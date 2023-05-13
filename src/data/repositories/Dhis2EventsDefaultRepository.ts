import { D2Api } from "@eyeseetea/d2-api/2.34";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { Instance } from "../entities/Instance";

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

    import(events: EventsPostRequest) {
        return (
            apiToFuture(this.api.events.post({}, events))
                // .flatMap(response => {
                //     return apiToFuture(this.api.system.waitFor(response.response.jobType, response.response.id));
                // })
                .map(result => {
                    if (!result) {
                        return {
                            status: "ERROR",
                            description: "An unexpected error has ocurred saving data values",
                            importCount: {
                                imported: 0,
                                updated: 0,
                                ignored: 0,
                                deleted: 0,
                            },
                            conficts: [],
                        };
                    }

                    return result;
                })
        );
    }
}

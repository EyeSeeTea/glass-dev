import { getD2APiFromInstance } from "../../utils/d2-api";
import { Instance } from "../entities/Instance";
import { EventsPostResponse } from "@eyeseetea/d2-api/api/events";
import { Future, FutureData } from "../../domain/entities/Future";
import { HttpResponse } from "@eyeseetea/d2-api/api/common";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { RISIndividualData } from "../../domain/entities/data-entry/amr-i-external/RISIndividualData";
import { TrackerRepository } from "../../domain/repositories/TrackerRepository";

export class TrackerDefaultRepository implements TrackerRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    import(events: RISIndividualData[]): FutureData<void> {
        return Future.fromPromise(
            this.api
                .post<HttpResponse<EventsPostResponse>>("/events", { strategy: "" }, events)
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

import { getD2APiFromInstance } from "../../utils/d2-api";
import { Instance } from "../entities/Instance";
import { Future, FutureData } from "../../domain/entities/Future";
import { HttpResponse } from "@eyeseetea/d2-api/api/common";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { TrackerRepository } from "../../domain/repositories/TrackerRepository";

export interface TrackerPostRequest {
    trackedEntities: TrackedEntity[];
}

export interface TrackedEntity {
    orgUnit: string;
    trackedEntity: string;
    trackedEntityType: string;
    enrollments: Enrollment[];
}

export interface Enrollment {
    orgUnit: string;
    program: string;
    enrollment: string;
    trackedEntityType: string;
    enrolledAt: "2019-08-19T00:00:00.000";
    deleted: false;
    occurredAt: "2019-08-19T00:00:00.000";
    status: "ACTIVE";
    notes: [];
    relationships: [];
    attributes: EnrollmentAttribute[];
    events: EnrollmentEvent[];
}

export interface EnrollmentAttribute {
    attribute: string;
    // code: string;
    value: Date | string | number;
}
export interface EnrollmentEvent {
    program: string;
    event: string;
    programStage: string;
    orgUnit: string;
    dataValues: { dataElement: string; value: string | number }[];
    occurredAt: string;
}

export class TrackerDefaultRepository implements TrackerRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    import(entities: TrackedEntity[]): FutureData<void> {
        // this.api.post("/tracker", { importMode: "COMMIT" });
        return Future.fromPromise(
            this.api
                .post<HttpResponse<Response>>("/tracker", { async: false }, { trackedEntities: entities })
                .getData()
                .then(result => {
                    console.debug(result);
                    return result?.response;
                })
                .catch(error => {
                    console.debug(error);
                    if (error?.response?.data) return error.response.data.response;
                    else return error;
                })
        );
    }
}

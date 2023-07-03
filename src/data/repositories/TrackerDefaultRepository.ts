import { getD2APiFromInstance } from "../../utils/d2-api";
import { Instance } from "../entities/Instance";
import { Future, FutureData } from "../../domain/entities/Future";
import { HttpResponse } from "@eyeseetea/d2-api/api/common";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { TrackerRepository } from "../../domain/repositories/TrackerRepository";
import { ImportStrategy } from "../../domain/entities/data-entry/DataValuesSaveSummary";
import { apiToFuture } from "../../utils/futures";

export interface TrackerPostRequest {
    trackedEntities: TrackedEntity[];
}

interface ErrorReport {
    message: string;
    errorCode: string;
    trackerType: string;
    uid: string;
}

interface Stats {
    created: number;
    updated: number;
    deleted: number;
    ignored: number;
    total: number;
}

interface ObjectReports {
    trackerType: "ENROLLMENT" | "TRACKED_ENTITY" | "RELATIONSHIP" | "EVENT";
    uid: string;
    index: number;
    errorReports: ErrorReport[];
}

interface BundleReport {
    status: "OK";
    typeReportMap: {
        ENROLLMENT: {
            trackerType: "ENROLLMENT";
            stats: Stats;
            objectReports: ObjectReports[];
        };
        TRACKED_ENTITY: {
            trackerType: "TRACKED_ENTITY";
            stats: Stats;
            objectReports: ObjectReports[];
        };
        RELATIONSHIP: {
            trackerType: "RELATIONSHIP";
            stats: Stats;
            objectReports: ObjectReports[];
        };
        EVENT: {
            trackerType: "EVENT";
            stats: Stats;
            objectReports: ObjectReports[];
        };
    };
    stats: Stats;
}

export interface TrackerPostResponse {
    status: "OK" | "ERROR";
    validationReport: {
        errorReports: ErrorReport[];
        warningReports: ErrorReport[];
    };
    stats: Stats;
    bundleReport?: BundleReport;
}

export interface TrackedEntity {
    orgUnit: string;
    trackedEntity: string;
    trackedEntityType: string;
    enrollments?: Enrollment[];
}

export interface Enrollment {
    orgUnit: string;
    program: string;
    enrollment: string;
    trackedEntityType: string;
    notes: [];
    relationships: [];
    attributes: EnrollmentAttribute[];
    events: EnrollmentEvent[];
    enrolledAt: string;
    occurredAt: string;
}

export interface EnrollmentAttribute {
    attribute: string;
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

    import(req: TrackerPostRequest, action: ImportStrategy): FutureData<TrackerPostResponse> {
        return Future.fromPromise(
            this.api
                .post<HttpResponse<TrackerPostResponse>>("/tracker", { async: false, importStrategy: action }, req)
                .getData()
                .then(result => result)
                .catch(error => {
                    if (error?.response?.data) return error.response.data;
                    else return error;
                })
        );
    }

    public getAMRIProgramMetadata(AMRIProgramID: string, AMRDataProgramStageId: string): FutureData<any> {
        return apiToFuture(
            this.api.models.programs.get({
                fields: {
                    id: true,
                    programStages: {
                        id: true,
                        name: true,
                        programStageDataElements: {
                            dataElement: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                    programTrackedEntityAttributes: { trackedEntityAttribute: { id: true, name: true, code: true } },
                },
                filter: { id: { eq: AMRIProgramID } },
            })
        ).map(response => {
            const programStage = response.objects[0]?.programStages.find(ps => ps.id === AMRDataProgramStageId);
            return {
                programAttributes: response.objects[0]?.programTrackedEntityAttributes.map(
                    atr => atr.trackedEntityAttribute
                ),
                programStageDataElements: programStage?.programStageDataElements.map(de => de.dataElement),
            };
        });
    }
}

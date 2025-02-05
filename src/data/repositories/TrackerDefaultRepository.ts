import _ from "lodash";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { Instance } from "../entities/Instance";
import { Future, FutureData } from "../../domain/entities/Future";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { TrackerRepository } from "../../domain/repositories/TrackerRepository";
import { ImportStrategy } from "../../domain/entities/data-entry/DataValuesSaveSummary";
import { apiToFuture } from "../../utils/futures";
import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { importApiTracker } from "./utils/importApiTracker";
import { Id } from "../../domain/entities/Ref";
import { TrackerPostRequest } from "../../domain/entities/TrackedEntityInstance";

const CHUNKED_SIZE = 100;
export class TrackerDefaultRepository implements TrackerRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    import(req: TrackerPostRequest, action: ImportStrategy): FutureData<TrackerPostResponse> {
        return importApiTracker(this.api, req, action);
    }

    getExistingTrackedEntitiesIdsByIds(trackEntitiesIds: Id[], programId: Id): FutureData<Id[]> {
        const chunkedTrackEntitiesIds = _(trackEntitiesIds).chunk(CHUNKED_SIZE).value();
        return Future.sequential(
            chunkedTrackEntitiesIds.flatMap(trackEntitiesIdsChunk => {
                const trackEntitiesIdsString = trackEntitiesIdsChunk.join(";");
                return apiToFuture(
                    this.api.tracker.trackedEntities.get({
                        trackedEntity: trackEntitiesIdsString,
                        fields: trackedEntitiesFields,
                        program: programId,
                        enrollmentEnrolledBefore: new Date().toISOString(),
                        pageSize: CHUNKED_SIZE,
                        ouMode: "ALL",
                    })
                ).map(response => {
                    return _.compact(response.instances.map(instance => instance.trackedEntity));
                });
            })
        ).flatMap(trackedEntitiesIds => Future.success(_.flatten(trackedEntitiesIds)));
    }

    getExistingEventsIdsByIds(eventIds: Id[], programId: Id): FutureData<Id[]> {
        const chunkedEventIds = _(eventIds).chunk(CHUNKED_SIZE).value();
        return Future.sequential(
            chunkedEventIds.flatMap(eventIdsChunk => {
                const eventIdsString = eventIdsChunk.join(";");
                return apiToFuture(
                    this.api.tracker.events.get({
                        event: eventIdsString,
                        fields: {
                            event: true,
                        },
                        program: programId,
                        pageSize: CHUNKED_SIZE,
                    })
                ).map(response => {
                    return response.instances.map(instance => instance.event);
                });
            })
        ).flatMap(eventIds => Future.success(_.flatten(eventIds)));
    }

    public getProgramMetadata(programID: string, programStageId: string): FutureData<any> {
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
                                valueType: true,
                            },
                        },
                    },
                    programTrackedEntityAttributes: {
                        trackedEntityAttribute: {
                            id: true,
                            name: true,
                            code: true,
                            valueType: true,
                            optionSetValue: true,
                            optionSet: { options: { name: true, code: true } },
                        },
                    },
                },
                filter: { id: { eq: programID } },
            })
        ).map(response => {
            const programStage = response.objects[0]?.programStages.find(ps => ps.id === programStageId);
            return {
                programAttributes: response.objects[0]?.programTrackedEntityAttributes.map(
                    atr => atr.trackedEntityAttribute
                ),
                programStageDataElements: programStage?.programStageDataElements.map(de => de.dataElement),
            };
        });
    }
}

const trackedEntitiesFields = {
    trackedEntity: true,
} as const;

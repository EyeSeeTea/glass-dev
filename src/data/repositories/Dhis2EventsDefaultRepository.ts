import { getD2APiFromInstance } from "../../utils/d2-api";
import { Instance } from "../entities/Instance";
import { ImportStrategy } from "../../domain/entities/data-entry/DataValuesSaveSummary";
import { Future, FutureData } from "../../domain/entities/Future";
import { EGASP_PROGRAM_ID } from "./program-rule/ProgramRulesMetadataDefaultRepository";
import { D2TrackerEvent, TrackerEventsResponse } from "@eyeseetea/d2-api/api/trackerEvents";
import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { D2Api, Id } from "@eyeseetea/d2-api/2.34";
import { apiToFuture } from "../../utils/futures";
import { AMCDataQuestionnaire } from "../../domain/entities/Questionnaire";
import { AMR_GLASS_AMC_DET_DS_PERIOD } from "../../domain/usecases/data-entry/amc/ImportAMCQuestionnaireData";
import { trackerPostResponseDefaultError } from "./utils/TrackerPostResponseDefaultError";

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
        return apiToFuture(this.api.tracker.postAsync({ importStrategy: action }, events)).flatMap(response => {
            return apiToFuture(this.api.system.waitFor("TRACKER_IMPORT_JOB", response.response.id)).flatMap(result => {
                if (result) {
                    return Future.success(result);
                } else {
                    return Future.success(trackerPostResponseDefaultError);
                }
            });
        });
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

    //The AMC-Data Questionnaire is implemented as a Event Program
    //There could be a maximum of 6 events for this Program - no need of paging.
    getAMCDataQuestionnaireEvtsByOUAndPeriod(orgUnitId: Id, year: string): FutureData<D2TrackerEvent[]> {
        return apiToFuture(
            this.api.tracker.events.get({
                fields: { $owner: true, event: true, dataValues: true, orgUnit: true, scheduledAt: true },
                program: AMCDataQuestionnaire,
                orgUnit: orgUnitId,
            })
        ).flatMap(res => {
            //Filter by year
            const amcQuestionnaireEvents = res.instances.filter(
                e => e.dataValues.find(dv => dv.dataElement === AMR_GLASS_AMC_DET_DS_PERIOD)?.value === year
            );
            return Future.success(amcQuestionnaireEvents);
        });
    }
}

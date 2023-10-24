import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";
import { Dhis2EventsDefaultRepository } from "../../../../data/repositories/Dhis2EventsDefaultRepository";
import { Future, FutureData } from "../../../entities/Future";
import { Questionnaire } from "../../../entities/Questionnaire";
import { Id } from "../../../entities/Ref";
import { AMC_PROGRAM_ID } from "../../GetCaptureFormQuestionsUseCase";

export class ImportAMCQuestionnaireData {
    constructor(private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository) {}

    importAMCQuestionnaireData(questionnaire: Questionnaire, orgUnitId: Id): FutureData<void> {
        const events: D2TrackerEvent[] = [];
        return this.mapQuestionnaireToEvent(questionnaire, orgUnitId).flatMap(event => {
            events.push(event);
            return this.dhis2EventsDefaultRepository
                .import({ events: events }, "CREATE_AND_UPDATE")
                .flatMap(importSummary => {
                    if (importSummary.status === "OK") {
                        return Future.success(undefined);
                    } else {
                        return Future.error(`An error occured on save : ${importSummary.message}`);
                    }
                });
        });
    }

    private mapQuestionnaireToEvent(questionnaire: Questionnaire, orgUnitId: string): FutureData<D2TrackerEvent> {
        const questions = questionnaire.sections.flatMap(section => section.questions);

        const dataValues = _.compact(
            questions.map(q => {
                if (q) {
                    if (q.type === "select" && q.value) {
                        return {
                            dataElement: q.id,
                            value: q.value.code,
                        };
                    } else if (q.type === "singleCheck") {
                        return {
                            dataElement: q.id,
                            value: q.value ? true : undefined,
                        };
                    } else {
                        return {
                            dataElement: q.id,
                            value: q.value,
                        };
                    }
                }
            })
        );

        //TO DO :  Save existing events
        // if (eventId) {
        //     return this.dhis2EventsDefaultRepository.getEventById(eventId).flatMap(event => {
        //         const updatedEvent: D2TrackerEvent = {
        //             ...event,
        //             status: eventStatus,
        //             dataValues: dataValues as DataValue[],
        //         };
        //         return Future.success({ event: updatedEvent, confidential, message });
        //     });
        // } else {

        const event: D2TrackerEvent = {
            event: "",
            orgUnit: orgUnitId,
            program: AMC_PROGRAM_ID,
            status: "ACTIVE",
            occurredAt: new Date().toISOString().split("T")?.at(0) || "",
            //@ts-ignore
            dataValues: dataValues,
        };
        return Future.success(event);
        // }
    }
}

import { D2TrackerEvent, DataValue } from "@eyeseetea/d2-api/api/trackerEvents";
import { Dhis2EventsDefaultRepository } from "../../../../data/repositories/Dhis2EventsDefaultRepository";
import { Future, FutureData } from "../../../entities/Future";
import { Questionnaire } from "../../../entities/Questionnaire";
import { Id } from "../../../entities/Ref";
import { AMC_PROGRAM_ID } from "../../GetProgramQuestionnaireUseCase";

export const AMR_GLASS_AMC_DET_DS_PERIOD = "W4D5kpe1il2";
export class ImportAMCQuestionnaireData {
    constructor(private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository) {}

    importAMCQuestionnaireData(
        questionnaire: Questionnaire,
        orgUnitId: Id,
        period: string,
        eventId: string | undefined
    ): FutureData<void> {
        const events: D2TrackerEvent[] = [];
        return this.mapQuestionnaireToEvent(eventId, questionnaire, orgUnitId, period).flatMap(event => {
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

    private mapQuestionnaireToEvent(
        eventId: string | undefined,
        questionnaire: Questionnaire,
        orgUnitId: string,
        period: string
    ): FutureData<D2TrackerEvent> {
        const questions = questionnaire.sections.flatMap(section => section.questions);

        const dataValues = _.compact(
            questions.map(q => {
                if (q) {
                    //Add data submission period to the event
                    if (q.id === AMR_GLASS_AMC_DET_DS_PERIOD) {
                        return {
                            dataElement: q.id,
                            value: period,
                        };
                    } else if (q.type === "select" && q.value) {
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

        if (eventId) {
            return this.dhis2EventsDefaultRepository.getEventById(eventId).flatMap(event => {
                const updatedEvent: D2TrackerEvent = {
                    ...event,
                    dataValues: dataValues as DataValue[],
                };
                return Future.success(updatedEvent);
            });
        } else {
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
        }
    }
}

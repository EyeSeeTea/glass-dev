import { Dhis2EventsDefaultRepository, Event } from "../../../../data/repositories/Dhis2EventsDefaultRepository";
import { SignalDefaultRepository } from "../../../../data/repositories/SignalDefaultRepository";
import { Future, FutureData } from "../../../entities/Future";
import { Questionnaire } from "../../../entities/Questionnaire";
import { generateId } from "../../../entities/Ref";
import { Signal, SignalStatusTypes } from "../../../entities/Signal";
import { CaptureFormRepository } from "../../../repositories/CaptureFormRepository";
export const EAR_PROGRAM_ID = "SQe26z0smFP";
const EAR_CONFIDENTIAL_DATAELEMENT = "KycX5z7NLqU";
export class ImportCaptureDataUseCase {
    constructor(
        private captureFormRepository: CaptureFormRepository,
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private signalRepository: SignalDefaultRepository
    ) {}

    execute(
        questionnaire: Questionnaire,
        orgUnit: string,
        module: string,
        action: "Save" | "Submit"
    ): FutureData<void> {
        //1.Create Event
        const events: Event[] = [];
        const { event, confidential } = this.mapQuestionnaireToEvent(questionnaire, orgUnit);
        events.push(event);

        return this.dhis2EventsDefaultRepository
            .import({ events: events }, "CREATE_AND_UPDATE")
            .flatMap(importSummary => {
                const eventId = importSummary.importSummaries?.at(0)?.reference;
                if (importSummary.status === "SUCCESS" && eventId) {
                    //2.Create datastore entry

                    let status: SignalStatusTypes = "DRAFT";
                    if (action === "Submit" && confidential) {
                        status = "PENDING_APPROVAL";
                    } else {
                        status = "APPROVED";
                    }

                    const signal: Signal = {
                        id: generateId(),
                        creationDate: new Date().toISOString(),
                        eventId: eventId,
                        module: module,
                        orgUnit: orgUnit,
                        status: status,
                        statusHistory: [
                            {
                                to: status,
                                changedAt: new Date().toISOString(),
                            },
                        ],
                    };
                    return this.signalRepository.save(signal).flatMap(() => {
                        //3.Send notification
                        //a.Non-confidential
                        //b.Confidential
                        return Future.success(undefined);
                    });
                } else {
                    return Future.error("Error creating EAR event");
                }
            });
    }

    private mapQuestionnaireToEvent(
        questionnaire: Questionnaire,
        orgUnit: string
    ): { event: Event; confidential: boolean } {
        const questions = questionnaire.sections.flatMap(section => section.questions);
        let confidential = true;
        const dataValues = _.compact(
            questions.map(q => {
                if (q && q.value) {
                    if (q.type === "select") {
                        if (q.id === EAR_CONFIDENTIAL_DATAELEMENT && q.value.code === "NONCONFIDENTIAL") {
                            confidential = false;
                        }
                        return {
                            dataElement: q.id,
                            value: q.value.code,
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

        const event: Event = {
            event: "",
            orgUnit: orgUnit,
            program: EAR_PROGRAM_ID,
            status: "ACTIVE",
            eventDate: new Date().toISOString().split("T")?.at(0) || "",
            //@ts-ignore
            dataValues: dataValues,
        };

        return { event, confidential };
    }
}

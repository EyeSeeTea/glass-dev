import { EventStatus } from "@eyeseetea/d2-api";
import { D2TrackerEvent, DataValue } from "@eyeseetea/d2-api/api/trackerEvents";
import { Dhis2EventsDefaultRepository } from "../../../../data/repositories/Dhis2EventsDefaultRepository";
import { SignalDefaultRepository } from "../../../../data/repositories/SignalDefaultRepository";
import { UsersDefaultRepository } from "../../../../data/repositories/UsersDefaultRepository";
import { Future, FutureData } from "../../../entities/Future";
import { Questionnaire } from "../../../entities/Questionnaire";
import { generateId } from "../../../entities/Ref";
import { Signal, SignalStatusTypes } from "../../../entities/Signal";
import { NotificationRepository } from "../../../repositories/NotificationRepository";

export const EAR_PROGRAM_ID = "SQe26z0smFP";
const EAR_CONFIDENTIAL_DATAELEMENT = "KycX5z7NLqU";
export type SignalAction = "Save" | "Publish";

export class ImportSignalsUseCase {
    constructor(
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private signalRepository: SignalDefaultRepository,
        private notificationRepository: NotificationRepository,
        private usersDefaultRepository: UsersDefaultRepository
    ) {}

    importSignals(
        signalId: string | undefined,
        signalEventId: string | undefined,
        questionnaire: Questionnaire,
        orgUnit: { id: string; name: string; path: string },
        module: { id: string; name: string },
        action: SignalAction,
        nonConfidentialUserGroups: string[],
        confidentialUserGroups: string[]
    ): FutureData<void> {
        //1.Create Event
        const events: D2TrackerEvent[] = [];
        return this.mapQuestionnaireToEvent(signalEventId, questionnaire, orgUnit.id, orgUnit.name, action).flatMap(
            ({ event, confidential, message }) => {
                events.push(event);

                return this.dhis2EventsDefaultRepository
                    .import({ events: events }, "CREATE_AND_UPDATE")
                    .flatMap(importSummary => {
                        // const eventId = importSummary.importSummaries?.at(0)?.reference;
                        const eventId = importSummary.bundleReport.typeReportMap.EVENT.objectReports[0]?.uid;
                        if (importSummary.status === "OK" && eventId) {
                            //2.Create datastore entry
                            let status: SignalStatusTypes = "DRAFT";
                            if (action === "Publish") {
                                if (confidential) {
                                    status = "PENDING_APPROVAL";
                                } else {
                                    status = "APPROVED";
                                }
                            }
                            const levelOfConfidentiality = confidential ? "CONFIDENTIAL" : "NONCONFIDENTIAL";
                            if (signalId) {
                                return this.signalRepository.getById(signalId).flatMap(existingSignal => {
                                    const updatedSignal: Signal = { ...existingSignal, levelOfConfidentiality, status };
                                    if (
                                        existingSignal.statusHistory[existingSignal.statusHistory.length - 1]?.to !==
                                        status
                                    ) {
                                        updatedSignal.statusHistory.push({
                                            from: existingSignal.statusHistory[existingSignal.statusHistory.length - 1]
                                                ?.to,
                                            to: status,
                                            changedAt: new Date().toISOString(),
                                        });
                                    }
                                    return this.saveSignal(
                                        updatedSignal,
                                        action,
                                        confidential,
                                        orgUnit,
                                        confidentialUserGroups,
                                        nonConfidentialUserGroups,
                                        module,
                                        message
                                    );
                                });
                            } else {
                                const signal: Signal = {
                                    id: generateId(),
                                    creationDate: new Date().toISOString(),
                                    eventId: eventId,
                                    module: module.id,
                                    orgUnit: { id: orgUnit.id, name: orgUnit.name },
                                    levelOfConfidentiality,
                                    status: status,
                                    statusHistory: [
                                        {
                                            to: status,
                                            changedAt: new Date().toISOString(),
                                        },
                                    ],
                                };
                                return this.saveSignal(
                                    signal,
                                    action,
                                    confidential,
                                    orgUnit,
                                    confidentialUserGroups,
                                    nonConfidentialUserGroups,
                                    module,
                                    message
                                );
                            }
                        } else {
                            return Future.error("Error creating EAR event");
                        }
                    });
            }
        );
    }

    private mapQuestionnaireToEvent(
        eventId: string | undefined,
        questionnaire: Questionnaire,
        orgUnitId: string,
        orgUnitName: string,
        signalAction: SignalAction
    ): FutureData<{ event: D2TrackerEvent; confidential: boolean; message: string }> {
        const questions = questionnaire.sections.flatMap(section => section.questions);
        let confidential = false; //Non confidential by default
        let message = "";
        const dataValues = _.compact(
            questions.map(q => {
                if (q) {
                    if (q.type === "select" && q.value) {
                        message = message + `${q.text} : ${q.value.name} \n\n`;
                        if (q.id === EAR_CONFIDENTIAL_DATAELEMENT && q.value.code === "CONFIDENTIAL") {
                            confidential = true;
                        }
                        return {
                            dataElement: q.id,
                            value: q.value.code,
                        };
                    } else {
                        message = message + `${q.text} : ${q.value} \n\n`;
                        return {
                            dataElement: q.id,
                            value: q.value,
                        };
                    }
                }
            })
        );
        const eventStatus: EventStatus = signalAction === "Save" ? "ACTIVE" : "COMPLETED";

        if (eventId) {
            return this.dhis2EventsDefaultRepository.getEventById(eventId).flatMap(event => {
                const updatedEvent: D2TrackerEvent = {
                    ...event,
                    status: eventStatus,
                    dataValues: dataValues as DataValue[],
                };
                return Future.success({ event: updatedEvent, confidential, message });
            });
        } else {
            const event: D2TrackerEvent = {
                event: "",
                orgUnit: orgUnitId,
                orgUnitName,
                program: EAR_PROGRAM_ID,
                status: eventStatus,
                occurredAt: new Date().toISOString().split("T")?.at(0) || "",
                //@ts-ignore
                dataValues: dataValues,
            };
            return Future.success({ event, confidential, message });
        }
    }

    private saveSignal(
        signal: Signal,
        action: SignalAction,
        confidential: boolean,
        orgUnit: { id: string; name: string; path: string },
        confidentialUserGroups: string[],
        nonConfidentialUserGroups: string[],
        module: { id: string; name: string },
        message: string
    ): FutureData<void> {
        return this.signalRepository.save(signal).flatMap(() => {
            if (action === "Save")
                //If the action is save, then do not send any notification till publish
                return Future.success(undefined);

            //3.Send notification
            let usergroupIds: string[] = [];
            let orgUnitPath = "";
            if (confidential) {
                //a.Confidential
                orgUnitPath = orgUnit.path;
                usergroupIds = confidentialUserGroups;
            } else {
                //b.Non-confidential
                usergroupIds = nonConfidentialUserGroups;
            }

            const confidentialTypeText = confidential ? "Confidential" : "Non-confidential";
            const subject = `${confidentialTypeText} Signal for ${module.name} module and country ${
                orgUnit.name
            } created at ${new Date().toISOString()}`;

            return this.usersDefaultRepository
                .getUsersFilteredbyOUsAndUserGroups(orgUnitPath, usergroupIds)
                .flatMap(users => {
                    return this.notificationRepository.send(subject, message, users);
                });
        });
    }
}

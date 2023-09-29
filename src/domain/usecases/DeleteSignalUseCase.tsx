import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";
import { Dhis2EventsDefaultRepository } from "../../data/repositories/Dhis2EventsDefaultRepository";
import { SignalDefaultRepository } from "../../data/repositories/SignalDefaultRepository";
import { Future, FutureData } from "../entities/Future";
import { SignalStatusTypes } from "../entities/Signal";
import { EAR_PROGRAM_ID } from "./data-entry/ear/ImportCaptureDataUseCase";

export class DeleteSignalUseCase {
    constructor(
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private signalRepository: SignalDefaultRepository
    ) {}

    execute(
        signalId: string | undefined,
        signalEventId: string,
        status: SignalStatusTypes,
        orgUnitId: string
    ): FutureData<void> {
        //1.Delete Event
        const events: D2TrackerEvent[] = [];
        const event: D2TrackerEvent = {
            event: signalEventId,
            orgUnit: orgUnitId,
            program: EAR_PROGRAM_ID,
            status: status === "DRAFT" ? "ACTIVE" : "COMPLETED",
            occurredAt: "",
            dataValues: [],
        };
        events.push(event);

        return this.dhis2EventsDefaultRepository.import({ events: events }, "DELETE").flatMap(importSummary => {
            if (importSummary.status === "OK" && signalId) {
                //2.Delete datastore entry
                return this.signalRepository.delete(signalId);
            } else {
                return Future.error("Error deleting EAR event");
            }
        });
    }
}

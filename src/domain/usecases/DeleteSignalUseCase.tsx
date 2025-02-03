import { Dhis2EventsDefaultRepository } from "../../data/repositories/Dhis2EventsDefaultRepository";
import { SignalDefaultRepository } from "../../data/repositories/SignalDefaultRepository";
import { Future, FutureData } from "../entities/Future";
import { SignalStatusTypes } from "../entities/Signal";
import { TrackerEvent } from "../entities/TrackedEntityInstance";
import { EAR_PROGRAM_ID, EAR_PROGRAM_STAGE } from "./GetProgramQuestionnaireUseCase";

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
        const events: TrackerEvent[] = [];
        const event: TrackerEvent = {
            event: signalEventId,
            orgUnit: orgUnitId,
            program: EAR_PROGRAM_ID,
            programStage: EAR_PROGRAM_STAGE,
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

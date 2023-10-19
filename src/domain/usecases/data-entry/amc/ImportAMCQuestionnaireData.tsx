import { Dhis2EventsDefaultRepository } from "../../../../data/repositories/Dhis2EventsDefaultRepository";
import { SignalDefaultRepository } from "../../../../data/repositories/SignalDefaultRepository";
import { UsersDefaultRepository } from "../../../../data/repositories/UsersDefaultRepository";
import { Future, FutureData } from "../../../entities/Future";
import { NotificationRepository } from "../../../repositories/NotificationRepository";

export class ImportAMCQuestionnaireData {
    constructor(
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private signalRepository: SignalDefaultRepository,
        private notificationRepository: NotificationRepository,
        private usersDefaultRepository: UsersDefaultRepository
    ) {}

    importAMCQuestionnaireData(): FutureData<void> {
        return Future.error("Not eyt implemented");
    }
}

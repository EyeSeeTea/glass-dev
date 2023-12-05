import { Dhis2EventsDefaultRepository } from "../../../data/repositories/Dhis2EventsDefaultRepository";
import { SignalDefaultRepository } from "../../../data/repositories/SignalDefaultRepository";
import { UsersDefaultRepository } from "../../../data/repositories/UsersDefaultRepository";
import { Future, FutureData } from "../../entities/Future";
import { Questionnaire } from "../../entities/Questionnaire";
import { NotificationRepository } from "../../repositories/NotificationRepository";
import { ImportAMCQuestionnaireData } from "./amc/ImportAMCQuestionnaireData";
import { ImportSignalsUseCase, SignalAction } from "./ear/ImportSignalsUseCase";

export class ImportProgramQuestionnaireDataUseCase {
    constructor(
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private signalRepository: SignalDefaultRepository,
        private notificationRepository: NotificationRepository,
        private usersDefaultRepository: UsersDefaultRepository
    ) {}

    execute(
        signalId: string | undefined,
        eventId: string | undefined,
        questionnaire: Questionnaire,
        orgUnit: { id: string; name: string; path: string },
        period: string,
        module: { id: string; name: string },
        action: SignalAction,
        nonConfidentialUserGroups: string[],
        confidentialUserGroups: string[]
    ): FutureData<void> {
        switch (module.name) {
            case "EAR": {
                const importEARData = new ImportSignalsUseCase(
                    this.dhis2EventsDefaultRepository,
                    this.signalRepository,
                    this.notificationRepository,
                    this.usersDefaultRepository
                );
                return importEARData.importSignals(
                    signalId,
                    eventId,
                    questionnaire,
                    orgUnit,
                    module,
                    action,
                    nonConfidentialUserGroups,
                    confidentialUserGroups
                );
            }
            case "AMC": {
                const importAMCData = new ImportAMCQuestionnaireData(this.dhis2EventsDefaultRepository);
                return importAMCData.importAMCQuestionnaireData(questionnaire, orgUnit.id, period, eventId);
            }
            default: {
                return Future.error("Unkown module");
            }
        }
    }
}

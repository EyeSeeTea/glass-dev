import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Ref } from "../entities/Ref";
import { NotificationRepository } from "../repositories/NotificationRepository";

export class SendNotificationsUseCase implements UseCase {
    constructor(private notificationRepository: NotificationRepository) {}

    public execute(subject: string, message: string, usergroupIds: Ref[], orgUnit: Ref): FutureData<void> {
        return this.notificationRepository.send(subject, message, usergroupIds, orgUnit);
    }
}

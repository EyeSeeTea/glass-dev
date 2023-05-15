import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Notification } from "../entities/Notifications";
import { Id } from "../entities/Ref";
import { NotificationRepository } from "../repositories/NotificationRepository";

export class GetNotificationByIdUseCase implements UseCase {
    constructor(private notificationRepository: NotificationRepository) {}

    public execute(id: Id): FutureData<Notification> {
        return this.notificationRepository.get(id);
    }
}

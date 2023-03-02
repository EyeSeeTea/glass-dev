import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Notification } from "../entities/Notifications";
import { NotificationRepository } from "../repositories/NotificationRepository";

export class GetNotificationsUseCase implements UseCase {
    constructor(private notificationRepository: NotificationRepository) {}

    public execute(): FutureData<Notification[]> {
        return this.notificationRepository.getAll();
    }
}

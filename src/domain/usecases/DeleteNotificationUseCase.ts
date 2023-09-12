import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { NotificationRepository } from "../repositories/NotificationRepository";

export class DeleteNotificationUseCase implements UseCase {
    constructor(private notificationRepository: NotificationRepository) {}

    public execute(notificationId: string, userId: string): FutureData<void> {
        return this.notificationRepository.delete(notificationId, userId);
    }
}

import { UseCase } from "../../CompositionRoot";
import { UsersDefaultRepository } from "../../data/repositories/UsersDefaultRepository";
import { FutureData } from "../entities/Future";
import { NotificationRepository } from "../repositories/NotificationRepository";

export class SendNotificationsUseCase implements UseCase {
    constructor(
        private notificationRepository: NotificationRepository,
        private usersDefaultRepository: UsersDefaultRepository
    ) {}

    public execute(subject: string, message: string, usergroupIds: string[], orgUnits: string[]): FutureData<void> {
        return this.usersDefaultRepository.getAllFilteredbyOUsAndUserGroups(orgUnits, usergroupIds).flatMap(users => {
            return this.notificationRepository.send(subject, message, users);
        });
    }
}

import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { NotificationRepository } from "../repositories/NotificationRepository";
import { UsersRepository } from "../repositories/UsersRepository";

export class SendNotificationsUseCase implements UseCase {
    constructor(private notificationRepository: NotificationRepository, private usersRepository: UsersRepository) {}

    public execute(subject: string, message: string, usergroupIds: string[], orgUnitPath: string): FutureData<void> {
        return this.usersRepository.getUsersFilteredbyOUsAndUserGroups(orgUnitPath, usergroupIds).flatMap(users => {
            return this.notificationRepository.send(subject, message, users);
        });
    }
}

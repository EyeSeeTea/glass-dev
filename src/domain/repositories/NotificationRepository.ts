import { Id } from "@eyeseetea/d2-api";
import { FutureData } from "../entities/Future";
import { Notification } from "../entities/Notifications";
import { Ref } from "../entities/Ref";

export interface NotificationRepository {
    getAll(): FutureData<Notification[]>;
    get(id: Id): FutureData<Notification>;
    send(subject: string, message: string, users: Ref[]): FutureData<void>;
    delete(notificationId: Id, userId: Id): FutureData<void>;
}

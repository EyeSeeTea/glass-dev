import { FutureData } from "../entities/Future";
import { Notification } from "../entities/Notifications";

export interface NotificationRepository {
    get(): FutureData<Notification[]>;
}

import { Id } from "@eyeseetea/d2-api";
import { FutureData } from "../entities/Future";
import { Notification } from "../entities/Notifications";

export interface NotificationRepository {
    getAll(): FutureData<Notification[]>;
    get(id: Id): FutureData<Notification>;
}

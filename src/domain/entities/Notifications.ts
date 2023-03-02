import { Id } from "./Ref";

export interface Notification {
    id: Id;
    date: string;
    subject: string;
    users?: UserNotification[];
    messages?: MessageNotification[];
}

export interface UserNotification {
    id: Id;
    name: string;
    username: string;
}

export interface MessageNotification {
    text: string;
    sender: string;
    date: string;
}

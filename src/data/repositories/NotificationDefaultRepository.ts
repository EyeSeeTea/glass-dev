import { D2Api } from "@eyeseetea/d2-api/2.34";
import { FutureData } from "../../domain/entities/Future";
import { Notification } from "../../domain/entities/Notifications";
import { NotificationRepository } from "../../domain/repositories/NotificationRepository";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { Instance } from "../entities/Instance";

export class NotificationDefaultRepository implements NotificationRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    //https://metadata.eyeseetea.com/glass/api/36/messageConversations?filter=messageType:eq:PRIVATE&pageSize=10&page=1&fields=id,displayName,subject,messageType,lastSender[id,displayName],assignee[id,displayName],status,priority,lastUpdated,read,lastMessage,followUp&order=lastMessage:desc

    get(): FutureData<Notification[]> {
        return apiToFuture(
            this.api.models.messageConversations
                .get({
                    fields: {
                        id: true,
                        subject: true,
                        lastMessage: true,
                    },
                    page: 1,
                    pageSize: 10,
                    filter: {
                        messageType: { eq: "PRIVATE" },
                    },
                    order: "lastMessage:desc",
                })
                .map(response => {
                    return response.data.objects.map(message => {
                        return {
                            id: message.id,
                            date: message.lastMessage,
                            message: message.subject,
                        };
                    });
                })
        );
    }
}

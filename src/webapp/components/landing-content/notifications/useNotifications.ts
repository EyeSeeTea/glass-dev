import React from "react";
import { CompositionRoot } from "../../../../CompositionRoot";
import { Notification } from "../../../../domain/entities/Notifications";
import { GlassState } from "../../../hooks/State";

export type NotificationsState = GlassState<Notification[]>;

export function useNotifications(compositionRoot: CompositionRoot) {
    const [notifications, setNotifications] = React.useState<NotificationsState>({
        kind: "loading",
    });

    const [shouldRefresh, refreshUploads] = React.useState({});

    React.useEffect(() => {
        compositionRoot.notifications.getAll().run(
            notifications => setNotifications({ kind: "loaded", data: notifications }),
            error => setNotifications({ kind: "error", message: error })
        );
    }, [compositionRoot, shouldRefresh]);

    return { notifications, refreshUploads };
}

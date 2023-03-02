import React from "react";
import { CompositionRoot } from "../../../../CompositionRoot";
import { Notification } from "../../../../domain/entities/Notifications";
import { GlassState } from "../../../hooks/State";

export type NotificationsState = GlassState<Notification[]>;

export function useNotifications(compositionRoot: CompositionRoot) {
    const [result, setResult] = React.useState<NotificationsState>({
        kind: "loading",
    });

    React.useEffect(() => {
        compositionRoot.notifications.getAll().run(
            notifications => setResult({ kind: "loaded", data: notifications }),
            error => setResult({ kind: "error", message: error })
        );
    }, [compositionRoot]);

    return result;
}

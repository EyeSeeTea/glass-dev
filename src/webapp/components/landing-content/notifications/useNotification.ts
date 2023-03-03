import React from "react";
import { CompositionRoot } from "../../../../CompositionRoot";
import { Notification } from "../../../../domain/entities/Notifications";
import { GlassState } from "../../../hooks/State";

export type NotificationsState = GlassState<Notification>;

export function useNotification(compositionRoot: CompositionRoot, id: string) {
    const [result, setResult] = React.useState<NotificationsState>({
        kind: "loading",
    });

    React.useEffect(() => {
        compositionRoot.notifications.getById(id).run(
            notification => setResult({ kind: "loaded", data: notification }),
            error => setResult({ kind: "error", message: error })
        );
    }, [compositionRoot, id]);

    return result;
}

import React from "react";
import { GlassState } from "./State";
import { useAppContext } from "../contexts/app-context";

export type AnalyticsRunTimeState = GlassState<string>;

export function useGetLastSuccessfulAnalyticsRunTime() {
    const { compositionRoot } = useAppContext();
    const [lastSuccessfulAnalyticsRunTime, setLastSuccessfulAnalyticsRunTime] = React.useState<AnalyticsRunTimeState>({
        kind: "loading",
    });

    React.useEffect(() => {
        compositionRoot.systemInfo.lastAnalyticsRunTime().run(
            runTime => {
                setLastSuccessfulAnalyticsRunTime({ kind: "loaded", data: runTime });
            },
            () => {
                setLastSuccessfulAnalyticsRunTime({ kind: "error", message: "" });
            }
        );
    }, [compositionRoot]);

    return lastSuccessfulAnalyticsRunTime;
}

import React from "react";
import { GlassState } from "./State";
import { useAppContext } from "../contexts/app-context";

export type AnalyticsRunTimeState = GlassState<Date>;

export function useGetLastSuccessfulAnalyticsRunTime() {
    const { compositionRoot } = useAppContext();
    const [refetch, setRefetch] = React.useState({});
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
    }, [compositionRoot, refetch]);

    return { lastSuccessfulAnalyticsRunTime, setRefetch };
}

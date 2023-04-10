import React from "react";
import { GlassState } from "./State";
import { useAppContext } from "../contexts/app-context";
import { useCurrentModuleContext } from "../contexts/current-module-context";

export type GlassDashboardState = GlassState<string>;

export function useGlassReportDashboard() {
    const { compositionRoot } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const [result, setResult] = React.useState<GlassDashboardState>({
        kind: "loading",
    });

    React.useEffect(() => {
        compositionRoot.glassDashboard.getReportDashboard(currentModuleAccess.moduleId).run(
            reportDashboard => setResult({ kind: "loaded", data: reportDashboard }),
            error => setResult({ kind: "error", message: error })
        );
    }, [compositionRoot, currentModuleAccess]);

    return result;
}

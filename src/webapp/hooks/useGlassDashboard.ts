import React from "react";
import { GlassState } from "./State";
import { useAppContext } from "../contexts/app-context";
import { useCurrentModuleContext } from "../contexts/current-module-context";

export type GlassDashboardState = GlassState<string>;
export function useGlassDashboard() {
    const { compositionRoot } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const [reportDashboardId, setReportDashboardId] = React.useState<GlassDashboardState>({
        kind: "loading",
    });
    const [validationDashboardId, setValidationDashboardId] = React.useState<GlassDashboardState>({
        kind: "loading",
    });

    React.useEffect(() => {
        compositionRoot.glassDashboard.getDashboard(currentModuleAccess.moduleId).run(
            dashboardData => {
                setReportDashboardId({ kind: "loaded", data: dashboardData.reportDashboard });
                setValidationDashboardId({ kind: "loaded", data: dashboardData.validationDashboard });
            },
            error => {
                setReportDashboardId({ kind: "error", message: error });
                setValidationDashboardId({ kind: "error", message: error });
            }
        );
    }, [compositionRoot, currentModuleAccess]);

    return { reportDashboardId, validationDashboardId };
}

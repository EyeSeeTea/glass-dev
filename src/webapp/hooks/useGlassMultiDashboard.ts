import React from "react";
import { GlassState } from "./State";
import { useAppContext } from "../contexts/app-context";
import { useCurrentModuleContext } from "../contexts/current-module-context";
import { Id, NamedRef } from "../../domain/entities/Ref";

export type GlassMultiDashboardState = GlassState<NamedRef[] | undefined>;
export type DashboardType = "Report" | "Validation";
export function useGlassMultiDashboard(type: DashboardType) {
    const { compositionRoot } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const [dashboardTab, setDashboardTab] = React.useState<Id>("");

    const [multiReportsDashboardsIds, setMultiReportsDashboardsIds] = React.useState<GlassMultiDashboardState>({
        kind: "loading",
    });
    const [multiValidationDashboardsIds, setMultiValidationDashboardsIds] = React.useState<GlassMultiDashboardState>({
        kind: "loading",
    });

    React.useEffect(() => {
        if (
            type === "Report" &&
            multiReportsDashboardsIds.kind === "loaded" &&
            multiReportsDashboardsIds.data &&
            multiReportsDashboardsIds.data[0]
        )
            setDashboardTab(multiReportsDashboardsIds.data[0].id);
        else if (
            type === "Validation" &&
            multiValidationDashboardsIds.kind === "loaded" &&
            multiValidationDashboardsIds.data &&
            multiValidationDashboardsIds.data[0]
        )
            setDashboardTab(multiValidationDashboardsIds.data[0].id);
    }, [setDashboardTab, multiReportsDashboardsIds, multiValidationDashboardsIds, type]);

    const changeTab = (event: React.ChangeEvent<{}>) => {
        const newDashboardId = event as unknown as string;
        if (newDashboardId) setDashboardTab(newDashboardId);
    };

    React.useEffect(() => {
        compositionRoot.glassDashboard.getMultipleDashboards(currentModuleAccess.moduleId).run(
            ({ multiReportsMenu, multiValidationReports }) => {
                setMultiReportsDashboardsIds({ kind: "loaded", data: multiReportsMenu });
                setMultiValidationDashboardsIds({
                    kind: "loaded",
                    data: multiValidationReports,
                });
            },
            error => {
                setMultiReportsDashboardsIds({ kind: "error", message: error });
                setMultiValidationDashboardsIds({
                    kind: "error",
                    message: error,
                });
            }
        );
    }, [compositionRoot, currentModuleAccess]);

    return { multiReportsDashboardsIds, multiValidationDashboardsIds, dashboardTab, changeTab };
}

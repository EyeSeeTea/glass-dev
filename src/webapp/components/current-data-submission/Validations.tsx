import React from "react";
import { EmbeddedReport } from "../reports/EmbeddedReport";
import { CircularProgress } from "material-ui";
import { useGlassDashboard } from "../../hooks/useGlassDashboard";
import { Typography } from "@material-ui/core";
import { useGetLastSuccessfulAnalyticsRunTime } from "../../hooks/useGetLastSuccessfulAnalyticsRunTime";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { MultiDashboardContent } from "../reports/MultiDashboardContent";

export const Validations: React.FC = () => {
    const { validationDashboardId } = useGlassDashboard();

    const { currentModuleAccess } = useCurrentModuleContext();
    const { lastSuccessfulAnalyticsRunTime } = useGetLastSuccessfulAnalyticsRunTime();
    return (
        <>
            {lastSuccessfulAnalyticsRunTime.kind === "loaded" && (
                <Typography>
                    Last Successful Analytics Tables Update Time :
                    {new Date(lastSuccessfulAnalyticsRunTime.data).toUTCString()}. Any data submitted after this date
                    will not be reflected in these visualizations
                </Typography>
            )}

            {moduleProperties.get(currentModuleAccess.moduleName)?.isMultiDashboard ? (
                <MultiDashboardContent type="Validation" />
            ) : (
                <>
                    {validationDashboardId.kind === "loading" && <CircularProgress />}
                    {validationDashboardId.kind === "loaded" && (
                        <EmbeddedReport dashboardId={validationDashboardId.data} />
                    )}
                </>
            )}
        </>
    );
};

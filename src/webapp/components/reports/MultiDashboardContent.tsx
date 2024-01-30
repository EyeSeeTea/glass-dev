import { Box } from "@material-ui/core";
import { TabContext, TabList, TabPanel } from "@material-ui/lab";
import { Tab } from "material-ui";
import { DashboardType, useGlassMultiDashboard } from "../../hooks/useGlassMultiDashboard";
import { EmbeddedReport } from "./EmbeddedReport";

export const MultiDashboardContent: React.FC<{ type: DashboardType }> = ({ type }) => {
    const { multiValidationDashboardsIds, multiReportsDashboardsIds, dashboardTab, changeTab } =
        useGlassMultiDashboard(type);

    const dashboards = type === "Report" ? multiReportsDashboardsIds : multiValidationDashboardsIds;
    return (
        <>
            {dashboards.kind === "loaded" && dashboards.data && (
                <Box sx={{ width: "100%" }}>
                    <TabContext value={dashboardTab}>
                        <Box sx={{ borderBottom: 2 }}>
                            <TabList>
                                {dashboards.data.map(dashboard => {
                                    return (
                                        <Tab
                                            style={{ padding: "10px" }}
                                            key={dashboard.id}
                                            label={dashboard.name}
                                            value={dashboard.id}
                                            onClick={changeTab}
                                        ></Tab>
                                    );
                                })}
                            </TabList>
                        </Box>

                        {dashboards.data.map(dashboard => {
                            return (
                                <TabPanel value={dashboard.id} key={dashboard.id}>
                                    <EmbeddedReport key={dashboard.id} dashboardId={dashboard.id} />
                                </TabPanel>
                            );
                        })}
                    </TabContext>
                </Box>
            )}
        </>
    );
};

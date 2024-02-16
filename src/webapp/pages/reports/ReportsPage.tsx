import { Breadcrumbs, Button } from "@material-ui/core";
import React from "react";
import styled from "styled-components";
import { glassColors, palette } from "../app/themes/dhis2.theme";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { NavLink } from "react-router-dom";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { EmbeddedReport } from "../../components/reports/EmbeddedReport";
import { useGlassDashboard } from "../../hooks/useGlassDashboard";
import { CircularProgress } from "material-ui";
import { useDownloadAllData } from "../../hooks/useDownloadAllData";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { MultiDashboardContent } from "../../components/reports/MultiDashboardContent";

export const GLASS_DASHBOARD_ID = "w7Kub3oACD9";
export const ReportsPage: React.FC = React.memo(() => {
    return <ReportPageContent />;
});

export const ReportPageContent: React.FC = React.memo(() => {
    const { currentModuleAccess } = useCurrentModuleContext();
    const { reportDashboardId } = useGlassDashboard();
    const { moduleLineListings, downloadAllData, downloadAllLoading } = useDownloadAllData();

    return (
        <ContentWrapper>
            <PreContent>
                <StyledBreadCrumbs aria-label="breadcrumb" separator="">
                    <Button component={NavLink} to={`/reports`} exact={true}>
                        <span>{currentModuleAccess.moduleName}</span>
                    </Button>
                    <ChevronRightIcon />
                    <Button component={NavLink} to={`reports`} exact={true}>
                        <span>{i18n.t(`Reports`)}</span>
                    </Button>
                </StyledBreadCrumbs>
            </PreContent>
            {moduleProperties.get(currentModuleAccess.moduleName)?.downloadAllDataButtonReq && (
                <DownloadButtonContainer>
                    {downloadAllLoading ? (
                        <CircularProgress size={40} />
                    ) : (
                        moduleLineListings?.map(lineListing => {
                            return (
                                <Button
                                    key={lineListing.id}
                                    variant="contained"
                                    color="primary"
                                    onClick={() => downloadAllData(lineListing)}
                                >
                                    {i18n.t(`Download ${lineListing.name}` ?? "Download All Data")}
                                </Button>
                            );
                        })
                    )}
                </DownloadButtonContainer>
            )}

            {moduleProperties.get(currentModuleAccess.moduleName)?.isMultiDashboard ? (
                <MultiDashboardContent type="Report" />
            ) : (
                <>
                    {reportDashboardId.kind === "loading" && <CircularProgress />}
                    {reportDashboardId.kind === "loaded" && <EmbeddedReport dashboardId={reportDashboardId.data} />}
                </>
            )}
        </ContentWrapper>
    );
});

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const PreContent = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    .info {
        font-size: 14px;
        span {
            opacity: 0.5;
        }
        span:nth-child(1) {
            color: ${glassColors.green};
            opacity: 1;
        }
    }
`;

const StyledBreadCrumbs = styled(Breadcrumbs)`
    color: ${glassColors.mainPrimary};
    font-weight: 400;
    text-transform: uppercase;
    li {
        display: flex;
        align-items: center;
        p {
            padding: 6px 8px;
        }
        .MuiButton-root {
            span {
                color: ${glassColors.mainPrimary};
                font-size: 15px;
            }
        }
    }
    .MuiBreadcrumbs-separator {
        display: none;
    }
    svg {
        color: ${palette.text.secondary};
    }
`;

const DownloadButtonContainer = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 10px;
`;

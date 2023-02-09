/* eslint-disable no-console */
import { Breadcrumbs, Button } from "@material-ui/core";
import React, { useState } from "react";
import styled from "styled-components";
import { MainLayout } from "../../components/main-layout/MainLayout";
import { useAppContext } from "../../contexts/app-context";
import { useGlassModule } from "../../hooks/useGlassModule";
import { glassColors, palette } from "../app/themes/dhis2.theme";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { NavLink, useLocation } from "react-router-dom";
import { CustomCard } from "../../components/custom-card/CustomCard";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { CurrentDataSubmissionContent } from "../../components/current-data-submission/CurrentDataSubmissionContent";
import { useStatusDataSubmission } from "../../hooks/useStatusDataSubmission";
import { ContentLoader } from "../../components/content-loader/ContentLoader";
import { getUrlParam } from "../../utils/helpers";
import { useCurrentAccessContext } from "../../contexts/current-access-context";

interface CurrentDataSubmissionPageContentProps {
    moduleId: string;
    moduleName: string;
}

export const CurrentDataSubmissionPage: React.FC = React.memo(() => {
    const { compositionRoot } = useAppContext();

    const moduleName = getUrlParam("module");

    const result = useGlassModule(compositionRoot, moduleName);

    return (
        <MainLayout>
            <ContentLoader content={result}>
                {result.kind === "loaded" && (
                    <CurrentDataSubmissionPageContent moduleId={result.data.id} moduleName={moduleName} />
                )}
            </ContentLoader>
        </MainLayout>
    );
});

export const CurrentDataSubmissionPageContent: React.FC<CurrentDataSubmissionPageContentProps> = React.memo(
    ({ moduleId, moduleName }) => {
        const location = useLocation();
        const queryParameters = new URLSearchParams(location.search);
        const periodVal = queryParameters?.get("period");
        const [period, setPeriod] = useState(periodVal === null ? new Date().getFullYear() - 1 : parseInt(periodVal));

        const { compositionRoot, currentUser } = useAppContext();
        const { currentOrgUnitAccess, changeCurrentOrgUnitAccess } = useCurrentAccessContext();
        const orgUnitQueryParam = queryParameters?.get("orgUnit");

        if (orgUnitQueryParam && orgUnitQueryParam !== currentOrgUnitAccess.name) {
            //user changed the url to update orgUnit, so update orgUnit access context.
            const newCurrentOrgUnit = currentUser.userOrgUnitsAccess.find(ou => ou.name === orgUnitQueryParam);
            if (newCurrentOrgUnit) {
                changeCurrentOrgUnitAccess(newCurrentOrgUnit);
            }
        }

        const currentDataSubmissionStatus = useStatusDataSubmission(
            compositionRoot,
            moduleId,
            currentOrgUnitAccess.id,
            period
        );

        const click = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
            event.preventDefault();
            setPeriod(0); //new period value
        };

        return (
            <ContentLoader content={currentDataSubmissionStatus}>
                <ContentWrapper>
                    <PreContent>
                        {/* // TODO: replace this with a global reusable StyledBreadCrumbs component */}
                        <StyledBreadCrumbs aria-label="breadcrumb" separator="">
                            <Button
                                component={NavLink}
                                to={`/current-data-submission/?module=${moduleName}&orgUnit=${currentOrgUnitAccess.id}`}
                                exact={true}
                                onClick={click}
                            >
                                <span>{moduleName}</span>
                            </Button>
                            <ChevronRightIcon />
                            <Button
                                component={NavLink}
                                to={`/current-data-submission/?module=${moduleName}&orgUnit=${currentOrgUnitAccess.id}`}
                                exact={true}
                            >
                                <span>{i18n.t(`${period} Data Submission`)}</span>
                            </Button>
                        </StyledBreadCrumbs>
                        <div className="info">
                            <span>{i18n.t("Yearly data upload")}</span>, &nbsp;
                            <span>{i18n.t(currentOrgUnitAccess.name)}</span>
                        </div>
                    </PreContent>
                    {currentDataSubmissionStatus.kind === "loaded" && (
                        <>
                            <PageTitle statusColor={currentDataSubmissionStatus.data.colour}>
                                <h3>{i18n.t(`${period} Data Submission`)}</h3>
                                <div className="status">{i18n.t(currentDataSubmissionStatus.data.title)}</div>
                            </PageTitle>
                            <CustomCard padding="40px 60px 50px">
                                <CurrentDataSubmissionContent
                                    moduleName={moduleName}
                                    currentDataSubmissionStatus={currentDataSubmissionStatus.data}
                                />
                            </CustomCard>
                        </>
                    )}
                </ContentWrapper>
            </ContentLoader>
        );
    }
);

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

const PageTitle = styled.div<{ statusColor: string }>`
    display: flex;
    flex-direction: row;
    gap: 20px;
    align-items: center;
    h3 {
        margin: 0;
    }
    .status {
        display: inline-block;
        border-radius: 5px;
        padding: 3px 15px;
        background-color: ${props => (props.statusColor ? props.statusColor : glassColors.mainPrimary)};
        color: white;
        text-transform: uppercase;
        font-weight: bold;
        font-size: 12px;
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

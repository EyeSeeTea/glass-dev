/* eslint-disable no-console */
import { Breadcrumbs, Button, Typography } from "@material-ui/core";
import { CircularProgress } from "material-ui";
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
import { CurrentCallContent } from "../../components/current-call/CurrentCallContent";
import { useStatusCall } from "../../hooks/useStatusCall";

interface CurrentCallPageProps {
    moduleName: string;
}

interface CurrentCallPageContentProps {
    moduleId: string;
    moduleName: string;
}

export const CurrentCallPage: React.FC<CurrentCallPageProps> = React.memo(({ moduleName }) => {
    const { compositionRoot } = useAppContext();

    const result = useGlassModule(compositionRoot, moduleName);
    switch (result.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            return <Typography variant="h6">{result.message}</Typography>;
        case "loaded":
            return (
                <MainLayout>
                    <CurrentCallPageContent moduleName={moduleName} moduleId={result.data.id} />
                </MainLayout>
            );
    }
});

export const CurrentCallPageContent: React.FC<CurrentCallPageContentProps> = React.memo(({ moduleId, moduleName }) => {
    const location = useLocation();
    const queryParameters = new URLSearchParams(location.search);

    //TO DO : orgUnit and period will not be fetched from queryParameters, it will be fetched from context.
    const periodVal = queryParameters?.get("period");
    const orgUnitVal = queryParameters.get("orgUnit");

    //set default values till the context changes are integrated,
    //once context is implemented these values will never be null, defaults logic to be decided and implemented in context
    const [period, setPeriod] = useState(periodVal === null ? new Date().getFullYear() : parseInt(periodVal));
    const [orgUnit, setOrgUnit] = useState(orgUnitVal === null ? "" : orgUnitVal);

    const { compositionRoot } = useAppContext();
    const currentCallStatus = useStatusCall(compositionRoot, moduleId, orgUnit, period);

    const click = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        event.preventDefault();
        setPeriod(0); //new period value
        setOrgUnit("new orgUnit value");
    };

    switch (currentCallStatus.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            return <Typography variant="h6">{currentCallStatus.message}</Typography>;
        case "loaded": {
            return (
                <ContentWrapper>
                    <PreContent>
                        {/* // TODO: replace this with a global reusable StyledBreadCrumbs component */}
                        <StyledBreadCrumbs aria-label="breadcrumb" separator="">
                            <Button
                                component={NavLink}
                                to={`/current-call/${moduleName}`}
                                exact={true}
                                onClick={click}
                            >
                                <span>{moduleName}</span>
                            </Button>
                            <ChevronRightIcon />
                            <Button component={NavLink} to={`/current-call/${moduleName}`} exact={true}>
                                <span>{i18n.t(`${period} Call`)}</span>
                            </Button>
                        </StyledBreadCrumbs>
                        <div className="info">
                            <span>{i18n.t("Yearly data upload")}</span>, &nbsp;
                            <span>Spain</span>
                        </div>
                    </PreContent>
                    {currentCallStatus && (
                        <PageTitle statusColor={currentCallStatus.data.colour}>
                            <h3>{i18n.t(`${period} Call`)}</h3>
                            <div className="status">{i18n.t(currentCallStatus.data.title)}</div>
                        </PageTitle>
                    )}
                    <CustomCard padding="40px 60px 50px">
                        <CurrentCallContent moduleName={moduleName} currentCallStatus={currentCallStatus.data} />
                    </CustomCard>
                </ContentWrapper>
            );
        }
    }
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

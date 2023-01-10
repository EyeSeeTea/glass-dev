import { Breadcrumbs, Button, Typography } from "@material-ui/core";
import { CircularProgress } from "material-ui";
import React from "react";
import styled from "styled-components";
import { MainLayout } from "../../components/main-layout/MainLayout";
import { useAppContext } from "../../contexts/app-context";
import { useGlassModule } from "../../hooks/useGlassModule";
import { glassColors, palette } from "../app/themes/dhis2.theme";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { NavLink } from "react-router-dom";
import { CustomCard } from "../../components/custom-card/CustomCard";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { CurrentCallContent } from "../../components/current-call/CurrentCallContent";

interface CurrentCallPageContentProps {
    moduleName: string;
}

export const CurrentCallPage: React.FC<CurrentCallPageContentProps> = React.memo(({ moduleName }) => {
    return (
        <MainLayout>
            <CurrentCallPageContent moduleName={moduleName} />
        </MainLayout>
    );
});

export const CurrentCallPageContent: React.FC<CurrentCallPageContentProps> = React.memo(({ moduleName }) => {
    const { compositionRoot } = useAppContext();

    // TODO: replace useGlassModule (or parameters) with actual hook to fetch current call data
    const result = useGlassModule(compositionRoot, moduleName);

    const handleClick = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        event.preventDefault();
    };

    switch (result.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            return <Typography variant="h6">{result.message}</Typography>;
        case "loaded":
            return (
                <ContentWrapper moduleColor={result.data.color}>
                    <PreContent>
                        {/* // TODO: replace this with a global reusable StyledBreadCrumbs component */}
                        <StyledBreadCrumbs aria-label="breadcrumb" separator="">
                            <Button
                                component={NavLink}
                                to={`/current-call/${moduleName}`}
                                exact={true}
                                onClick={handleClick}
                            >
                                <span>{moduleName}</span>
                            </Button>
                            <ChevronRightIcon />
                            <Button component={NavLink} to={`/current-call/${moduleName}`} exact={true}>
                                <span>{i18n.t("2022 Call")}</span>
                            </Button>
                        </StyledBreadCrumbs>
                        <div className="info">
                            <span>{i18n.t("Yearly data upload")}</span>, &nbsp;
                            <span>Spain</span>
                        </div>
                    </PreContent>
                    <PageTitle>
                        <h3>{i18n.t("2022 Call")}</h3>
                        <div className="status">{i18n.t("Missing Data")}</div>
                    </PageTitle>
                    <CustomCard padding="40px 60px 50px">
                        <CurrentCallContent moduleName={moduleName} />
                    </CustomCard>
                </ContentWrapper>
            );
    }
});

const ContentWrapper = styled.div<{ moduleColor: string }>`
    display: flex;
    flex-direction: column;
    gap: 20px;
    .module-bg {
        background-color: ${props => (props.moduleColor ? props.moduleColor : glassColors.mainPrimary)};
    }
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

const PageTitle = styled.div`
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
        background-color: ${glassColors.yellow};
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

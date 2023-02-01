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
import { DataSubmissionsHistoryContent } from "../../components/data-submissions-history/DataSubmissionsHistoryContent";

interface DataSubmissionsHistoryPageProps {
    moduleName: string;
}

export const DataSubmissionsHistoryPage: React.FC<DataSubmissionsHistoryPageProps> = React.memo(({ moduleName }) => {
    return (
        <MainLayout>
            <DataSubmissionsHistoryPageContent moduleName={moduleName} />
        </MainLayout>
    );
});

export const DataSubmissionsHistoryPageContent: React.FC<DataSubmissionsHistoryPageProps> = React.memo(
    ({ moduleName }) => {
        const { compositionRoot } = useAppContext();

        // TODO: replace useGlassModule (or parameters) with actual hook to fetch data submissions history data
        const result = useGlassModule(compositionRoot, moduleName);

        const click = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
            event.preventDefault();
        };

        switch (result.kind) {
            case "loading":
                return <CircularProgress />;
            case "error":
                return <Typography variant="h6">{result.message}</Typography>;
            case "loaded":
                return (
                    <ContentWrapper>
                        <PreContent>
                            {/* // TODO: replace this with a global reusable StyledBreadCrumbs component */}
                            <StyledBreadCrumbs aria-label="breadcrumb" separator="">
                                <Button
                                    component={NavLink}
                                    to={`/current-data-submission/${moduleName}`}
                                    exact={true}
                                    onClick={click}
                                >
                                    <span>{moduleName}</span>
                                </Button>
                                <ChevronRightIcon />
                                <Button component={NavLink} to={`/data-submissions-history/${moduleName}`} exact={true}>
                                    <span>{i18n.t("List of Data Submissions")}</span>
                                </Button>
                            </StyledBreadCrumbs>
                        </PreContent>
                        <PageTitle>
                            <h2>{i18n.t("All Data Submissions")}</h2>
                        </PageTitle>
                        <CustomCard padding="40px 60px 50px">
                            <DataSubmissionsHistoryContent />
                        </CustomCard>
                    </ContentWrapper>
                );
        }
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

const PageTitle = styled.div`
    display: flex;
    flex-direction: row;
    gap: 20px;
    align-items: center;
    h2 {
        margin: 0;
        text-transform: uppercase;
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
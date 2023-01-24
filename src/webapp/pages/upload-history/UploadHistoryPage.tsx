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
import i18n from "@eyeseetea/d2-ui-components/locales";
import { UploadHistoryContent } from "../../components/upload-history/UploadHistoryContent";

interface UploadHistoryPageProps {
    moduleName: string;
}

export const UploadHistoryPage: React.FC<UploadHistoryPageProps> = React.memo(({ moduleName }) => {
    return (
        <MainLayout>
            <UploadHistoryPageContent moduleName={moduleName} />
        </MainLayout>
    );
});

export const UploadHistoryPageContent: React.FC<UploadHistoryPageProps> = React.memo(({ moduleName }) => {
    const { compositionRoot } = useAppContext();

    // TODO: replace useGlassModule (or parameters) with actual hook to fetch upload history data
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
                                to={`/current-call/${moduleName}`}
                                exact={true}
                                onClick={click}
                            >
                                <span>{moduleName} asdd</span>
                            </Button>
                            <ChevronRightIcon />
                            <Button component={NavLink} to={`/upload-history/${moduleName}`} exact={true}>
                                <span>{i18n.t("Upload History")}</span>
                            </Button>
                        </StyledBreadCrumbs>
                    </PreContent>
                    <UploadHistoryContent />
                </ContentWrapper>
            );
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

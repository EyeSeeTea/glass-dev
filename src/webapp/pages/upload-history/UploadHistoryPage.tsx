import { Breadcrumbs, Button } from "@material-ui/core";
import React from "react";
import styled from "styled-components";
import { MainLayout } from "../../components/main-layout/MainLayout";
import { glassColors, palette } from "../app/themes/dhis2.theme";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { NavLink } from "react-router-dom";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { UploadHistoryContent } from "../../components/upload-history/UploadHistoryContent";
import { getUrlParam } from "../../utils/helpers";

export const UploadHistoryPage: React.FC = React.memo(() => {

    const moduleName = getUrlParam("module") || "";

    const click = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        event.preventDefault();
    };
    return (
        <MainLayout>
            <ContentWrapper>
                <PreContent>
                    {/* // TODO: replace this with a global reusable StyledBreadCrumbs component */}
                    <StyledBreadCrumbs aria-label="breadcrumb" separator="">
                        <Button
                            component={NavLink}
                            to={`/current-call/?module=${moduleName}`}
                            exact={true}
                            onClick={click}
                        >
                            <span>{moduleName}</span>
                        </Button>
                        <ChevronRightIcon />
                        <Button component={NavLink} to={`/upload-history/${moduleName}`} exact={true}>
                            <span>{i18n.t("Upload History")}</span>
                        </Button>
                    </StyledBreadCrumbs>
                </PreContent>
                <UploadHistoryContent />
            </ContentWrapper>
        </MainLayout>
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

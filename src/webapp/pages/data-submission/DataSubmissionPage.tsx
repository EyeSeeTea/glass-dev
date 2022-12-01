import { Box, Breadcrumbs, Button, Link, Typography } from "@material-ui/core";
import { CircularProgress } from "material-ui";
import React from "react";
import styled from "styled-components";
import { DataSubmissionContent } from "../../components/data-submission/DataSubmissionContent";
import { MainLayout } from "../../components/main-layout/MainLayout";
import { useAppContext } from "../../contexts/app-context";
import { useGlassModule } from "../../hooks/useGlassModule";
import { glassColors, palette } from "../app/themes/dhis2.theme";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { NavLink } from "react-router-dom";
import { CustomCard } from "../../components/custom-card/CustomCard";
import i18n from "@eyeseetea/d2-ui-components/locales";

interface DataSubmissionPageProps {
    moduleName: string;
}

export const DataSubmissionPage: React.FC<DataSubmissionPageProps> = React.memo(({ moduleName }) => {
    console.log("init DataSubmissionPage...");

    return (
        <MainLayout>
            <DataSubmissionPageContent moduleName={moduleName} />
        </MainLayout>
    );
});

export const DataSubmissionPageContent: React.FC<DataSubmissionPageProps> = React.memo(({ moduleName }) => {
    const { compositionRoot } = useAppContext();

    const result = useGlassModule(compositionRoot, moduleName);

    function handleClick(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
        event.preventDefault();
    }

    switch (result.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            return <Typography variant="h6">{result.message}</Typography>;
        case "loaded":
            return (
                <React.Fragment>
                    <PreContent>
                        <StyledBreadCrumbs aria-label="breadcrumb" separator="">
                            <Button component={NavLink} to={`/#/current-call/${moduleName}`} exact={true}>
                                <Typography variant="body1" style={{ color: glassColors.greyBlack }}>
                                    {moduleName}
                                </Typography>
                            </Button>
                            <ChevronRightIcon />
                            <Typography>2020 Call</Typography>
                        </StyledBreadCrumbs>
                        <div className="info">
                            <span>{i18n.t("Yearly data upload")}</span>, &nbsp;
                            <span>Spain</span>
                        </div>
                    </PreContent>
                    <Box height={10} />
                    <CustomCard padding="30px 60px">
                        <DataSubmissionContent />
                    </CustomCard>
                </React.Fragment>
            );
    }
});


const PreContent = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    .info {
        font-size: 14px;
        span {
            opacity: .5;
        }
        span:nth-child(1) {
            color: ${glassColors.green};
            opacity: 1;
        }
    }   
`
const StyledBreadCrumbs = styled(Breadcrumbs)`
    color: ${glassColors.mainPrimary};
    font-weight: 400;
    text-transform: uppercase;
    li {
        display: flex;
        align-items: center;
    }
    svg {
        color: ${palette.text.secondary};
    }
`;

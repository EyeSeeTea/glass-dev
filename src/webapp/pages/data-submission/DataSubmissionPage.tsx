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
        console.info("You clicked a breadcrumb.");
    }

    switch (result.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            return <Typography variant="h6">{result.message}</Typography>;
        case "loaded":
            return (
                <React.Fragment>
                    <StyledBreadCrumbs aria-label="breadcrumb" separator="">
                        <Button component={NavLink} to={`/#/current-call/${moduleName}`} exact={true}>
                            <Typography variant="body1" style={{ color: glassColors.greyBlack }}>
                                {moduleName}
                            </Typography>
                        </Button>
                        <ChevronRightIcon />
                        <Typography>2020 Call</Typography>
                    </StyledBreadCrumbs>
                    <Box height={40} />
                    <DataSubmissionContent />
                </React.Fragment>
            );
    }
});

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

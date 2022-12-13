import React from "react";
import { Grid } from "@material-ui/core";
import { LandingNews } from "./LandingNews";
import styled from "styled-components";
import { OpenCalls } from "./OpenCalls";
import { YourNotifications } from "./YourNotifications";
import { useLocation } from "react-router-dom";

export const LandingContent: React.FC = () => {
    const location = useLocation();
    // TODO: get actual current module from global context or redux
    // const currentModule = location.substring(location.indexOf('/current-call/') + 1);
    // eslint-disable-next-line no-console
    console.log("location: ", location);

    return (
        <StyledGrid container spacing={4} alignItems="flex-start">
            <OpenCalls />
            <YourNotifications />
            <LandingNews />
        </StyledGrid>
    );
};

const StyledGrid = styled(Grid)`
    height: 100%;
    .section-title {
        font-weight: 600;
        margin: 0;
    }
`;

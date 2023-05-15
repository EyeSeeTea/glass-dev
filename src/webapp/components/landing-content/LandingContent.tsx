import React from "react";
import { Grid } from "@material-ui/core";
import { LandingNews } from "./LandingNews";
import styled from "styled-components";
import { OpenDataSubmissions } from "./OpenDataSubmissions";
import { YourNotifications } from "./notifications/YourNotifications";

export const LandingContent: React.FC = () => {
    return (
        <StyledGrid container spacing={4} alignItems="flex-start">
            <OpenDataSubmissions />
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

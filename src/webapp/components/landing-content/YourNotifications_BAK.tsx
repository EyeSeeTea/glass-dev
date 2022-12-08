import React from "react";
import { Grid } from "@material-ui/core";
import styled from "styled-components";

export const YourNotifications_BAK: React.FC = () => {
    return (
        <>
            <Grid item xs={12}>
                <h2 className="section-title">Your Notifications</h2>
            </Grid>
        </>
    );
};

const NotificationsCard = styled.div`
    height: 100%;
`;

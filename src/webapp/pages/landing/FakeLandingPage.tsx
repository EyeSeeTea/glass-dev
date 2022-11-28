import React from "react";
import { Grid } from "@material-ui/core";
import styled from "styled-components";
import { GlassAppBar } from "../../components/app-bar/GlassAppBar";
import { LandingContent } from "../../components/landing-content/LandingContent";
import { SideBar } from "../../components/sidebar/SideBar";

export const FakeLandingPage: React.FC = React.memo(() => {
    return (
        <React.Fragment>
            <GlassAppBar />
            <LandingContainer>
                <Grid container spacing={6}>
                    <Grid item xs={12} sm={2}>
                        <SideBar />
                    </Grid>
                    <Grid item xs={12} sm={10}>
                        <LandingContent />
                    </Grid>
                </Grid>
            </LandingContainer>
        </React.Fragment>
    );
});

const LandingContainer = styled.div`
    padding: 30px;
`;

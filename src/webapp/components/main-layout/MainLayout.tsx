import React from "react";
import { Grid } from "@material-ui/core";
import styled from "styled-components";
import { GlassAppBar } from "../app-bar/GlassAppBar";
import { SideBar } from "../sidebar/SideBar";

export const MainLayout: React.FC = React.memo(({ children }) => {
    return (
        <React.Fragment>
            <GlassAppBar />
            <LandingContainer>
                <Grid container spacing={6}>
                    <Grid item xs={12} sm={2}>
                        <SideBar />
                    </Grid>
                    <Grid item xs={12} sm={10}>
                        {children}
                    </Grid>
                </Grid>
            </LandingContainer>
        </React.Fragment>
    );
});

const LandingContainer = styled.div`
    padding: 30px;
`;

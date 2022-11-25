import React from "react";
import { Button, Grid } from "@material-ui/core";
import styled from "styled-components";
import { GlassAppBar } from "../../components/app-bar/GlassAppBar";
import { SideBar } from "../../components/sidebar/SideBar";
import ExitToAppIcon from "@material-ui/icons/ExitToApp";
import { CurrentCallContent } from "../../components/current-call-content/CurrentCallContent";

export const FakeCurrentCallPage: React.FC = React.memo(() => {
    return (
        <React.Fragment>
            <GlassAppBar />
            <LandingContainer>
                <Grid container spacing={6}>
                    <Grid item xs={12} sm={2}>
                        <SideBar />
                        <ButtonContainer>            
                            <div>
                                <StyledButton variant="contained" color="default" startIcon={<ExitToAppIcon />} disableElevation>
                                    Log Out
                                </StyledButton>
                            </div>
                        </ButtonContainer>
                    </Grid>
                    <Grid item xs={12} sm={10}>
                        <CurrentCallContent />
                    </Grid>
                </Grid>
            </LandingContainer>
        </React.Fragment>
    );
});

const LandingContainer = styled.div`
    padding: 30px;
    > .MuiGrid-container {
        .MuiGrid-item:first-child {
            min-width: 300px;
        }
        .MuiGrid-item:last-child {
            flex: 1;
        }
    }
`;

const ButtonContainer = styled.div`
    position: relative;
    top: -70px;
    width: 100%;
    display: block;
    z-index: 2;
    text-align: center;
    > div {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
`;

const StyledButton = styled(Button)`
    margin: 16px;
    background: transparent;
    text-transform: none;
`;
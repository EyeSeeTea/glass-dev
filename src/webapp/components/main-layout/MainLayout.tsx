import React from "react";
import { Button, Grid } from "@material-ui/core";
import styled from "styled-components";
import { GlassAppBar } from "../app-bar/GlassAppBar";
import { SideBar } from "../sidebar/SideBar";
import ExitToAppIcon from "@material-ui/icons/ExitToApp";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { AppFooter } from "../app-footer/AppFooter";

export const MainLayout: React.FC = React.memo(({ children }) => {
    return (
        <React.Fragment>
            <GlassAppBar />
            <LandingContainer>
                <RootGrid container spacing={6}>
                    <Grid item xs={12} sm={2}>
                        <SideBar />
                        <ButtonContainer>
                            <div>
                                <StyledButton
                                    variant="contained"
                                    color="default"
                                    startIcon={<ExitToAppIcon />}
                                    disableElevation
                                >
                                    {i18n.t("Log Out")}
                                </StyledButton>
                            </div>
                        </ButtonContainer>
                    </Grid>
                    <Grid item xs={12} sm={10}>
                        {children}
                        <AppFooter />
                    </Grid>
                </RootGrid>
            </LandingContainer>
        </React.Fragment>
    );
});

const RootGrid = styled(Grid)`
    @media (max-width: 1024px) {
        flex-direction: column;
        margin: 0;
        padding: 0;
        gap: 0;
        width: 100%;
        > div {
            max-width: none;
            width: 100%;
            margin: 0;
            &:first-child > div {
                min-height: 0;
                padding: 0 0 60px 0;
            }
        }
    }
`;

const LandingContainer = styled.div`
    padding: 30px;
    > .MuiGrid-container {
        .MuiGrid-item:first-child {
            min-width: 300px;
            > div {
            }
        }
        .MuiGrid-item:last-child {
            flex: 1;
            display: flex;
            flex-direction: column;
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

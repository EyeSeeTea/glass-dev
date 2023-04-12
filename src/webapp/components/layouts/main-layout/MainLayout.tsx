import React, { useState } from "react";
import { Button, Grid } from "@material-ui/core";
import styled from "styled-components";
import { GlassAppBar } from "../../app-bar/GlassAppBar";
import { SideBar } from "../../sidebar/SideBar";
import ExitToAppIcon from "@material-ui/icons/ExitToApp";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { AppFooter } from "../../app-footer/AppFooter";
import { goToDhis2Url } from "../../../utils/helpers";
import { useConfig } from "@dhis2/app-runtime";
import { SideBarProvider } from "../../../context-providers/SideBarProvider";

export const MainLayout: React.FC = ({ children }) => {
    const { baseUrl } = useConfig();
    const [showMenu, setShowMenu] = useState(true);
    window.matchMedia("(max-width: 1000px)").addEventListener("change", e => {
        if (e.matches) {
            setShowMenu(false);
        }
    });

    const logout = () => {
        goToDhis2Url(baseUrl, "/dhis-web-commons-security/logout.action");
    };

    const toggleShowMenu = () => {
        setShowMenu(prevShowMenu => {
            return !prevShowMenu;
        });
    };

    return (
        <SideBarProvider>
            <GlassAppBar toggleShowMenu={toggleShowMenu} />
            <LandingContainer>
                <Grid container spacing={6}>
                    <Grid item xs={12} sm={2} style={{ display: showMenu ? "block" : "none" }}>
                        <SideBar />
                        <ButtonContainer>
                            <div>
                                <StyledButton
                                    onClick={logout}
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
                    <Grid item xs={12} sm={10} style={{ overflow: "auto" }}>
                        {children}
                        <AppFooter />
                    </Grid>
                </Grid>
            </LandingContainer>
        </SideBarProvider>
    );
};

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

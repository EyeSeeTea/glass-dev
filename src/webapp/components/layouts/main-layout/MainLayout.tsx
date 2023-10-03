import React, { useState } from "react";
import { Grid } from "@material-ui/core";
import styled from "styled-components";
import { GlassAppBar } from "../../app-bar/GlassAppBar";
import { SideBar } from "../../sidebar/SideBar";
import { AppFooter } from "../../app-footer/AppFooter";

export const MainLayout: React.FC = ({ children }) => {
    const [showMenu, setShowMenu] = useState(true);
    window.matchMedia("(max-width: 1000px)").addEventListener("change", e => {
        if (e.matches) {
            setShowMenu(false);
        }
    });

    const toggleShowMenu = () => {
        setShowMenu(prevShowMenu => {
            return !prevShowMenu;
        });
    };

    return (
        <>
            <GlassAppBar toggleShowMenu={toggleShowMenu} />
            <LandingContainer>
                <Grid container spacing={6}>
                    <Grid item xs={12} sm={2} style={{ display: showMenu ? "block" : "none" }}>
                        <SideBar />
                    </Grid>
                    <Grid item xs={12} sm={10} style={{ overflow: "auto" }}>
                        {children}
                        <AppFooter />
                    </Grid>
                </Grid>
            </LandingContainer>
        </>
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

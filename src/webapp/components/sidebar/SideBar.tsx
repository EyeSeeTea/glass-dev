import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Box, Button, CircularProgress, Typography } from "@material-ui/core";
import { CustomCard } from "../custom-card/CustomCard";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import SidebarNav, { Menu } from "../sidebar-nav/SidebarNav";
import i18n from "../../../locales";
import { NavLink } from "react-router-dom";

import { useAppContext } from "../../contexts/app-context";
import { useGlassModules } from "../../hooks/useGlassModules";
import { mapModuleToMenu } from "./mapModuleToMenu";
import { useCurrentModuleContext } from "../../contexts/current-module-context";

export const SideBar: React.FC = () => {
    const { compositionRoot } = useAppContext();

    const [isLoaded, setIsLoaded] = useState(false);

    const localStoredMenu = localStorage.getItem("glassSideBarData");
    const [storedMenuData, setstoredMenuData] = useState<Menu[] | null>(
        localStoredMenu !== null ? JSON.parse(localStoredMenu) : null
    );

    const modulesResult = useGlassModules(compositionRoot);

    const { resetCurrentModuleAccess } = useCurrentModuleContext();

    useEffect(() => {
        // Validate localstorage vs datastore
        if (modulesResult.kind === "loaded" && modulesResult.data.length) {
            const menuData = modulesResult.data.map(module => mapModuleToMenu(module));
            if (!isLoaded || JSON.stringify(menuData) !== JSON.stringify(storedMenuData)) {
                localStorage.setItem("glassSideBarData", JSON.stringify(menuData));
                setstoredMenuData(menuData);
            }
            setIsLoaded(true);
        }
    }, [storedMenuData, modulesResult, isLoaded]);

    return (
        <CustomCard minheight="630px" padding="0 0 100px 0" data-test="test2">
            <HomeButtonWrapper>
                <Button
                    className="home-button"
                    component={NavLink}
                    to="/"
                    exact={true}
                    onClick={() => resetCurrentModuleAccess()}
                >
                    <StarGradient className="star-icon" />
                    <Box width={15} />
                    <Typography>{i18n.t("HOME")}</Typography>
                </Button>
            </HomeButtonWrapper>
            {!storedMenuData && <StyledCircularProgress />}
            {storedMenuData && <SidebarNav menus={storedMenuData} />}

            <div style={{ flexGrow: 1 }} />
        </CustomCard>
    );
};

const HomeButtonWrapper = styled.div`
    margin: 25px 0 0 0;
    .home-button {
        border-radius: 0;
        display: flex;
        flex-direction: row;
        text-transform: uppercase;
        cursor: pointer;
        justify-content: flex-start;
        padding: 10px 25px;
        margin: 0;
        &:hover {
            background: ${glassColors.accentPrimary} !important;
            color: white;
            .star-icon {
                background: white;
            }
        }
    }
`;

const StarGradient = styled.div`
    width: 23px;
    height: 23px;
    clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
    background: ${glassColors.accentPrimary};
`;

const StyledCircularProgress = styled(CircularProgress)`
    margin: 30px auto;
`;

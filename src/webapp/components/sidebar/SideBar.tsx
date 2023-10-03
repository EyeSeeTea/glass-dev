import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Backdrop, Box, Button, CircularProgress, Typography } from "@material-ui/core";
import { CustomCard } from "../custom-card/CustomCard";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import SidebarNav, { Menu } from "../sidebar-nav/SidebarNav";
import i18n from "../../../locales";
import { NavLink } from "react-router-dom";
import ExitToAppIcon from "@material-ui/icons/ExitToApp";
import { mapModuleToMenu } from "./mapModuleToMenu";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useConfig } from "@dhis2/app-runtime";
import { goToDhis2Url } from "../../utils/helpers";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
import { useSideBarModulesContext } from "../../contexts/sidebar-modules-context";

export const SideBar: React.FC = () => {
    const { baseUrl } = useConfig();
    const [storedMenuData, setStoredMenuData] = useState<Menu[] | null>();
    const { changeCurrentPeriod, getCurrentOpenPeriodByModule } = useCurrentPeriodContext();
    const { resetCurrentModuleAccess } = useCurrentModuleContext();
    const { accessibleModules, isLoading } = useSideBarModulesContext();

    const logout = () => {
        goToDhis2Url(baseUrl, "/dhis-web-commons-security/logout.action");
    };

    const updateModuleAndPeriodContext = () => {
        resetCurrentModuleAccess();
        changeCurrentPeriod(getCurrentOpenPeriodByModule("")); //Reset to current year
    };

    useEffect(() => {
        const menuData = accessibleModules.map(module => mapModuleToMenu(module));
        setStoredMenuData(menuData);
    }, [accessibleModules]);

    return (
        <SideBarContainer>
            <CustomCard minheight="600px" padding="0 0 80px 0" maxwidth="250px">
                <HomeButtonWrapper>
                    <Button
                        className="home-button"
                        component={NavLink}
                        to="/"
                        exact={true}
                        onClick={updateModuleAndPeriodContext}
                    >
                        <StarGradient className="star-icon" />
                        <Box width={15} />
                        <Typography>{i18n.t("HOME")}</Typography>
                    </Button>
                </HomeButtonWrapper>
                {storedMenuData && <SidebarNav menus={storedMenuData} />}

                <Backdrop open={isLoading} style={{ color: "#fff", zIndex: 1 }}>
                    <StyledCircularProgress color="inherit" size={30} />
                </Backdrop>

                <div style={{ flexGrow: 1 }} />
            </CustomCard>
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
        </SideBarContainer>
    );
};
const SideBarContainer = styled.div`
    height: 100%;
`;
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

export const StyledCircularProgress = styled(CircularProgress)`
    margin: 30px auto;
    size: 20;
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

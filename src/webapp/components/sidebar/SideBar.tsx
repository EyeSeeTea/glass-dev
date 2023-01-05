import React from "react";
import styled from "styled-components";
import { Box, Button, Typography } from "@material-ui/core";
import { CustomCard } from "../custom-card/CustomCard";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import SidebarNav from "../sidebar-nav/SidebarNav";
import i18n from "../../../locales";
import { NavLink } from "react-router-dom";
import sideBarData from "./sidebar-list.json";
import { mapModuleToMenu } from "../../hooks/useSidebarMenus";

export const SideBar: React.FC = () => {
    const menusResult = { kind: "loaded" as const, data: sideBarData.sideBarData.map(mapModuleToMenu) };

    return (
        <CustomCard minheight="630px" padding="0 0 100px 0" data-test="test2">
            <HomeButtonWrapper>
                <Button className="home-button" component={NavLink} to="/" exact={true}>
                    <StarGradient className="star-icon" />
                    <Box width={40} />
                    <Typography>{i18n.t("HOME")}</Typography>
                </Button>
            </HomeButtonWrapper>

            <SidebarNav menus={menusResult.data} />

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

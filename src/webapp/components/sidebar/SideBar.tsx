import React from "react";
import styled from "styled-components";
import { Box, Typography } from "@material-ui/core";
import StarIcon from "@material-ui/icons/Star";
import { CustomCard } from "../custom-card/CustomCard";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import SidebarNav, { Menu } from "../sidebar-nav/SidebarNav";
import FolderIcon from "@material-ui/icons/Folder";

export const SideBar: React.FC = () => {
    return (
        <CustomCard minHeight="630px" padding="0 0 100px 0">
            <TitleContainer>
                <StarIcon />
                <Box width={40} />
                <Typography>HOME</Typography>
            </TitleContainer>

            <SidebarNav menus={menus} />

            {/* <div style={{ flexGrow: 1 }} /> */}
        </CustomCard>
    );
};

const menus: Menu[] = [
    {
        kind: "MenuGroup",
        level: 0,
        title: "ARM",
        icon: <FolderIcon htmlColor={glassColors.lightSecondary} />,
        children: [
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Current Call",
                path: "/current-call",
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Reports",
                path: "",
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Upload History",
                path: "",
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Calls History",
                path: "",
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Country Information",
                path: "",
            },
        ],
    },
    {
        kind: "MenuGroup",
        level: 0,
        title: "AMC",
        icon: <FolderIcon htmlColor={glassColors.lightTertiary} />,
        children: [
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Current Call",
                path: "/current-call",
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Reports",
                path: "",
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Upload History",
                path: "",
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Calls History",
                path: "",
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Country Information",
                path: "",
            },
        ],
    },
    {
        kind: "MenuGroup",
        level: 0,
        title: "EGASP",
        icon: <FolderIcon htmlColor={glassColors.lightPrimary} />,
        children: [
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Current Call",
                path: "/current-call",
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Reports",
                path: "",
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Upload History",
                path: "",
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Calls History",
                path: "",
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Country Information",
                path: "",
            },
        ],
    },
];

const TitleContainer = styled.div`
    background: ${glassColors.lightSecondary};
    color: white;
    border-radius: 10px;
    padding: 14px 10px;
    margin: 16px;
    display: flex;
    flex-direction: row;
`;

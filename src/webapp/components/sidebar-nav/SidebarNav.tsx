/* eslint-disable react/no-multi-comp */
/* eslint-disable react/display-name */
import React, { useState } from "react";
import { makeStyles } from "@material-ui/styles";
import { List, Theme } from "@material-ui/core";
import clsx from "clsx";
import SidebarNavMenu from "./SidebarNavMenu";
import SidebarNavMenuGroup from "./SidebarNavMenuGroup";

export interface MenuGroup {
    kind: "MenuGroup";
    level: number;
    title: string;
    moduleColor: string;
    icon?: any;
    children?: Menu[];
}

export interface MenuLeaf {
    kind: "MenuLeaf";
    level: number;
    title: string;
    path: string;
    icon?: any;
}

export type Menu = MenuGroup | MenuLeaf;

interface SidebarNavProps {
    className?: string;
    menus: Menu[];
}

const SidebarNav: React.FC<SidebarNavProps> = ({ menus, className }) => {
    const classes = useStyles();
    const [currentNaVitem, setCurrentNavItem] = useState<string[]>([""]);

    const handleCurrentNavItem = (val: string[]) => {
        // TODO: cleanup this prop drilling and convert this using context API
        // eslint-disable-next-line no-console
        // console.log("handleCurrentNavItem: ", val);
        setCurrentNavItem(val);
    };

    return (
        <List className={clsx(classes.root, className)}>
            {menus.map(menu =>
                menu.kind === "MenuGroup" ? (
                    <SidebarNavMenuGroup
                        menu={menu}
                        key={menu.title}
                        groupName={menu.title}
                        currentNaVitem={currentNaVitem}
                        handleCurrentNavItem={handleCurrentNavItem}
                    />
                ) : (
                    <SidebarNavMenu
                        menu={menu}
                        key={menu.title}
                        currentNaVitem={currentNaVitem}
                        handleCurrentNavItem={handleCurrentNavItem}
                    />
                )
            )}
        </List>
    );
};

export default SidebarNav;

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        padding: theme.spacing(0),
    },
}));

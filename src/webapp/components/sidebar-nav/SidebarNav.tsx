import React from "react";
import { List } from "@material-ui/core";
import SidebarNavMenu from "./SidebarNavMenu";
import SidebarNavMenuGroup from "./SidebarNavMenuGroup";

export interface MenuGroup {
    kind: "MenuGroup";
    level: number;
    title: string;
    moduleColor: string;
    icon?: string;
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
    return (
        <List className={className}>
            {menus.map(menu =>
                menu.kind === "MenuGroup" ? (
                    <SidebarNavMenuGroup menu={menu} key={menu.title} groupName={menu.title} />
                ) : (
                    <SidebarNavMenu menu={menu} key={menu.title} />
                )
            )}
        </List>
    );
};

export default SidebarNav;

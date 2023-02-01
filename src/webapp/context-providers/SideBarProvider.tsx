import React, { useState } from "react";
import { CurrentMenuItem, SideBarContext, SideBarContextProps } from "../contexts/sidebar-context";
import { Menu } from "../components/sidebar-nav/SidebarNav";

export const defaultState: SideBarContextProps = {
    loaded: false,
    menuData: [{ kind: "MenuLeaf", level: 0, title: "", path: "" }],
    currentNavItem: ["", ""],
    setLoaded: () => {},
    setMenuData: () => {},
    setCurrentNavItem: () => {},
};

interface SideBarProviderProps {
    children: React.ReactNode;
}

export const SideBarProvider = ({ children }: SideBarProviderProps) => {
    const [menuData, setMenuData] = useState<Menu[]>(defaultState.menuData);
    const [currentNavItem, setCurrentNavItem] = useState<CurrentMenuItem>(defaultState.currentNavItem);
    const [loaded, setLoaded] = useState<boolean>(false);

    return (
        <SideBarContext.Provider
            value={{ loaded, setLoaded, menuData, setMenuData, currentNavItem, setCurrentNavItem }}
        >
            {children}
        </SideBarContext.Provider>
    );
};

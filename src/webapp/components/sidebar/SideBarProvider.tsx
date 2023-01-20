
import React, { useState } from "react";
import { CurrentMenuItem, SideBarContext, SideBarContextProps } from "../../contexts/sidebar-context";
import { Menu } from "../sidebar-nav/SidebarNav";


export const defaultState = {
    loaded: false,
    menuData: [{ kind: 'MenuLeaf', level: 0, title: '', path: '' }],
    currentNavItem: { groupName: '', name: '' },
    setLoaded: () => {},
    setMenuData: () => {},
    setCurrentNavItem: () => {}
} as SideBarContextProps

interface SideBarProviderProps {
    children: React.ReactNode
}

export const SideBarProvider = ({ children }: SideBarProviderProps) => {

    // const [loaded, setLoaded] = useState(false);
    const [menuData, setMenuData] = useState<Menu[]>(defaultState.menuData);
    const [currentNavItem, setCurrentNavItem] = useState<CurrentMenuItem>(defaultState.currentNavItem);
    const [loaded, setLoaded] = useState<boolean>(false);
    
    return (
        <SideBarContext.Provider value={{ loaded, setLoaded, menuData, setMenuData, currentNavItem, setCurrentNavItem }}>
            {children}
        </SideBarContext.Provider>
    );
};

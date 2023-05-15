import { createContext, useContext } from "react";
import { Menu } from "../components/sidebar-nav/SidebarNav";

export type CurrentMenuItem = string[];
export interface SideBarContextProps {
    loaded: boolean;
    menuData: Menu[];
    currentNavItem: CurrentMenuItem;
    setLoaded: (newLoaded: boolean) => void;
    setMenuData: (newMenuData: Menu[]) => void;
    setCurrentNavItem: (newCurrentNavItem: CurrentMenuItem) => void;
}

export const SideBarContext = createContext<SideBarContextProps | null>(null);

export function useSideBarContext() {
    const context = useContext(SideBarContext);
    if (context) {
        return context;
    } else {
        throw new Error("SideBar context uninitialized");
    }
}

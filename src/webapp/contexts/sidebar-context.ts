
import { createContext, Dispatch, SetStateAction } from "react";
import { Menu } from "../components/sidebar-nav/SidebarNav";
import { defaultState } from "../components/sidebar/SideBarProvider";

export interface CurrentMenuItem {
    groupName: string,
    name: string,
}

export interface SideBarContextProps {
    loaded: boolean,
    menuData: Menu[],
    currentNavItem: CurrentMenuItem;
    setLoaded: Dispatch<SetStateAction<boolean>>;
    setMenuData: Dispatch<SetStateAction<Menu[]>>;
    setCurrentNavItem: Dispatch<SetStateAction<CurrentMenuItem>>
}

export const SideBarContext = createContext<SideBarContextProps>(defaultState);
import { createContext, Dispatch, SetStateAction, useContext } from "react";
import { Menu } from "../components/sidebar-nav/SidebarNav";

export interface CurrentMenuItem {
    groupName: string;
    name: string;
}

export interface TestContextProps {
    loaded: boolean;
    menuData: Menu[];
    currentNavItem: CurrentMenuItem;
    setLoaded: Dispatch<SetStateAction<boolean>>;
    setMenuData: Dispatch<SetStateAction<Menu[]>>;
    setCurrentNavItem: Dispatch<SetStateAction<CurrentMenuItem>>;
}

export const defaultTestState = {
    loaded: false,
    menuData: [{ kind: "MenuLeaf", level: 0, title: "", path: "" }],
    currentNavItem: { groupName: "", name: "" },
    setLoaded: () => {},
    setMenuData: () => {},
    setCurrentNavItem: () => {},
} as TestContextProps;

export const TestContext = createContext<TestContextProps>(defaultTestState);

export function useTestContext() {
    const context = useContext(TestContext);
    if (context) {
        return context;
    } else {
        throw new Error("Test context uninitialized");
    }
}
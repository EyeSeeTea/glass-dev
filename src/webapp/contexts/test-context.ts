import { createContext, useContext } from "react";
import { Menu } from "../components/sidebar-nav/SidebarNav";

export interface CurrentMenuItem {
    groupName: string;
    name: string;
}

export interface TestContextProps {
    isDark: boolean;
    loaded: boolean;
    menuData: Menu[];
    currentNavItem: CurrentMenuItem;
    setIsDark: (newLoaded: boolean) => void;
    setLoaded: (newLoaded: boolean) => void;
    setMenuData: (newMenuData: Menu[]) => void;
    setCurrentNavItem: (newCurrentNavItem: CurrentMenuItem) => void;
}

export const defaultTestState = {
    isDark: false,
    loaded: false,
    menuData: [{ kind: "MenuLeaf", level: 0, title: "", path: "" }],
    currentNavItem: { groupName: "", name: "" },
    setIsDark: () => {},
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

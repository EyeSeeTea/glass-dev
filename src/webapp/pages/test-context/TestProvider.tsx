import React, { useState } from "react";
import { Menu } from "../../components/sidebar-nav/SidebarNav";
import { CurrentMenuItem, defaultTestState, TestContext } from "../../contexts/test-context";

interface SideBarProviderProps {
    children: React.ReactNode;
}

export const TestContextProvider = ({ children }: SideBarProviderProps) => {
    const [isDark, setIsDark] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [menuData, setMenuData] = useState<Menu[]>(defaultTestState.menuData);
    const [currentNavItem, setCurrentNavItem] = useState<CurrentMenuItem>(defaultTestState.currentNavItem);

    return (
        <TestContext.Provider
            value={{ isDark, setIsDark, loaded, setLoaded, menuData, setMenuData, currentNavItem, setCurrentNavItem }}
        >
            {children}
        </TestContext.Provider>
    );
};

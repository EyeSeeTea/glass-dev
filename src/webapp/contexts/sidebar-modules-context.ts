import { createContext, useContext } from "react";
import { GlassModule } from "../../domain/entities/GlassModule";

export type CurrentMenuItem = string[];
export interface SideBarContextProps {
    accessibleModules: GlassModule[];
    isLoading: boolean;
}

export const SideBarContext = createContext<SideBarContextProps | null>(null);

export function useSideBarModulesContext() {
    const context = useContext(SideBarContext);
    if (context) {
        return context;
    } else {
        throw new Error("SideBar context uninitialized");
    }
}

import { createContext, useContext } from "react";
import { ModuleAccess } from "../../domain/entities/User";

export interface CurrentModuleContextState {
    currentModuleAccess: ModuleAccess;
    changeCurrentModuleAccess: (module: string) => void;
    resetCurrentModuleAccess: () => void;
}

export const defaultModuleContextState = {
    currentModuleAccess: {
        moduleId: "",
        moduleName: "",
        readAccess: false,
        captureAccess: false,
        usergroups: [],
        quarterlyPeriodModules: [],
        populateCurrentYearInHistory: false,
    },
    changeCurrentModuleAccess: () => {},
    resetCurrentModuleAccess: () => {},
};

export const CurrentModuleContext = createContext<CurrentModuleContextState>(defaultModuleContextState);

export function useCurrentModuleContext() {
    const context = useContext(CurrentModuleContext);
    if (context) {
        return context;
    } else {
        throw new Error("Current Module Context uninitialized");
    }
}

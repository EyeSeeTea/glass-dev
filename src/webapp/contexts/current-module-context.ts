import { createContext, useContext } from "react";
import { UserGroupAccess } from "../../domain/entities/User";

export interface CurrentModuleContextState {
    currentModuleAccess: UserGroupAccess;
    changeCurrentModuleAccess: (moduleAccess: UserGroupAccess) => void;
}

export const defaultModuleContextState = {
    currentModuleAccess: { id: "", name: "", moduleId: "", moduleName: "", viewAccess: false, captureAccess: false },
    changeCurrentModuleAccess: () => {},
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

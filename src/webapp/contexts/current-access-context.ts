import { createContext, useContext } from "react";
import { OrgUnitAccess } from "../../domain/entities/User";

export interface CurrentAccessContextState {
    module: string;
    currentOrgUnitAccess: OrgUnitAccess;
    setModule: (newModule: string) => void;
    changeCurrentOrgUnitAccess: (orgUnitAccess: OrgUnitAccess) => void;
}

export const defaultGlassContextState = {
    module: "",
    currentOrgUnitAccess: { id: "", name: "", viewAccess: false, captureAccess: false },
    setModule: () => {},
    changeCurrentOrgUnitAccess: () => {},
};

export const CurrentAccessContext = createContext<CurrentAccessContextState>(defaultGlassContextState);

export function useCurrentAccessContext() {
    const context = useContext(CurrentAccessContext);
    if (context) {
        return context;
    } else {
        throw new Error("Current Glass Module Context uninitialized");
    }
}

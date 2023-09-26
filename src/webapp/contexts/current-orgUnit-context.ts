import { createContext, useContext } from "react";
import { OrgUnitAccess } from "../../domain/entities/User";

export interface CurrentOrgUnitContextState {
    currentOrgUnitAccess: OrgUnitAccess;
    changeCurrentOrgUnitAccess: (orgUnit: string) => void;
}

export const defaultOrgUnitContextState = {
    currentOrgUnitAccess: {
        orgUnitId: "",
        orgUnitName: "",
        orgUnitShortName: "",
        orgUnitCode: "",
        orgUnitPath: "",
        readAccess: false,
        captureAccess: false,
    },
    changeCurrentOrgUnitAccess: () => {},
};

export const CurrentOrgUnitContext = createContext<CurrentOrgUnitContextState>(defaultOrgUnitContextState);

export function useCurrentOrgUnitContext() {
    const context = useContext(CurrentOrgUnitContext);
    if (context) {
        return context;
    } else {
        throw new Error("Current Org Unit Context uninitialized");
    }
}

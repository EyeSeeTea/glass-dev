import { useEffect, useState } from "react";
import { getUrlParam } from "../utils/helpers";
import { defaultGlassContextState, CurrentModuleContext } from "../contexts/glass-module-context";

export const CurrentModuleContextProvider: React.FC = ({ children }) => {
    const [module, setModule] = useState<string>(defaultGlassContextState.module);
    const [orgUnit, setOrgUnit] = useState<string>("");

    useEffect(() => {
        const module = getUrlParam("module") || "";
        const orgUnit = getUrlParam("orgUnit") || "";
        setModule(module);
        setOrgUnit(orgUnit);
    }, []);

    return (
        <CurrentModuleContext.Provider value={{ module, orgUnit, setModule, setOrgUnit }}>
            {children}
        </CurrentModuleContext.Provider>
    );
};

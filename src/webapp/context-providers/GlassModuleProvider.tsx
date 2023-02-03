import { useEffect, useState } from "react";
import { getUrlParam } from "../utils/helpers";
import { defaultGlassContextState, GlassModuleContext } from "../contexts/glass-module-context";

export const GlassModuleContextProvider: React.FC = ({ children }) => {

    const [module, setModule] = useState<string>(defaultGlassContextState.module);
    const [orgUnit, setOrgUnit] = useState<string>('');

    useEffect(() => {
        const module = getUrlParam("module") || "";
        const orgUnit = getUrlParam("orgUnit") || "";
        setModule(module);
        setOrgUnit(orgUnit);
    }, []);

    return (
        <GlassModuleContext.Provider value={{ module, orgUnit, setModule, setOrgUnit }}>
            {children}
        </GlassModuleContext.Provider>
    )

};

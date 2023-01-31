import { useEffect, useState } from "react";
import { getUrlParam } from "../utils/helpers";
import { defaultModuleFromUrl, GlassModuleContext, ModuleFromUrl } from "../contexts/glass-module-context";

export const GlassModuleContextProvider: React.FC = ({ children }) => {
    const [glassModule, setGlassModule] = useState<ModuleFromUrl>(defaultModuleFromUrl);

    useEffect(() => {
        const moduleName = getUrlParam("module") || "";
        const orgUnit = getUrlParam("orgUnit") || "";
        setGlassModule({
            module: moduleName,
            orgUnit: orgUnit,
        });
    }, []);

    return <GlassModuleContext.Provider value={glassModule}>{children}</GlassModuleContext.Provider>;
};

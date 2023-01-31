import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { GlassModuleContext } from "./glass-module-context";

export const GlassModuleContextProvider: React.FC = ({ children }) => {
    const { module = "", orgUnit = "" } = useParams<{
        module?: string;
        orgUnit?: string;
    }>();

    const [glassModule, setGlassModule] = useState({ module, orgUnit });

    useEffect(() => {
        setGlassModule({ module, orgUnit });
    }, [module, orgUnit]);

    return (
        <GlassModuleContext.Provider value={glassModule}>
            {children}
        </GlassModuleContext.Provider>
    );
};
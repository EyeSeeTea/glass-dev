import { createContext, useContext } from "react";

export interface UrlModuleParams {
    module: string;
    orgUnit: string;
}

export const GlassModuleContext = createContext<UrlModuleParams>({
    module: "",
    orgUnit: "",
});

export const useGlassModuleContext = () => useContext(GlassModuleContext);

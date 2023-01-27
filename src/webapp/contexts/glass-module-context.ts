import { createContext, useContext } from "react";

export interface UrlModuleParams {
    module: string, orgUnit: string
}


export const GlassModuleContext = createContext<string | null>(null);

export function useGlassModuleContext() {
    const context = useContext(GlassModuleContext);
    if (context) {
        return context;
    } else {
        throw new Error("Glass Module context uninitialized");
    }
}

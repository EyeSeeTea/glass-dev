import { createContext, useContext } from "react";

export interface GlassModuleContextProps {
    module: string;
    orgUnit: string;
    setModule: (newModule: string) => void;
    setOrgUnit: (newOrgUnit: string) => void;
}

export const defaultGlassContextState = {
    module: "",
    orgUnit: "",
    setModule: () => {},
    setOrgUnit: () => {},
};

export const GlassModuleContext = createContext<GlassModuleContextProps>(defaultGlassContextState);

export function useGlassModuleContext() {
    const context = useContext(GlassModuleContext);
    if (context) {
        return context;
    } else {
        throw new Error("Glass Module Context uninitialized");
    }
}

import { createContext, useContext } from "react";

export interface ModuleFromUrl {
    module: string;
    orgUnit: string;
}

export const defaultModuleFromUrl = {
    module: '',
    orgUnit: '',
}

export const GlassModuleContext = createContext<ModuleFromUrl>(defaultModuleFromUrl);

export const useGlassModuleContext = () => useContext(GlassModuleContext);

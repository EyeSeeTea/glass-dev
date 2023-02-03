import { createContext, useState } from "react";

export interface ModuleFromUrl {
    module: string;
    orgUnit: string;
}

export const defaultModuleFromUrl = {
    module: "",
    orgUnit: "",
};

export const GlassModuleContext = createContext<ModuleFromUrl>(defaultModuleFromUrl);

export const useGlassModuleContext = () => {
    const [state, setState] = useState<ModuleFromUrl>(defaultModuleFromUrl);
    return {
        ...state,
        setModule: (module: string) => setState({ ...state, module }),
        setOrgUnit: (orgUnit: string) => setState({ ...state, orgUnit }),
    };
};

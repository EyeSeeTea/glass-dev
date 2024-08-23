import React, { useContext } from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { UserAccessInfo } from "../../domain/entities/User";
import { D2Api } from "../../types/d2-api";
import { Instance } from "../../data/entities/Instance";
import { Country } from "../../domain/entities/Country";

export interface AppContextState {
    api: D2Api;
    currentUser: UserAccessInfo;
    compositionRoot: CompositionRoot;
    instance: Instance;
    allCountries: Country[];
}

export const AppContext = React.createContext<AppContextState | null>(null);

export function useAppContext() {
    const context = useContext(AppContext);
    if (context) {
        return context;
    } else {
        throw new Error("App context uninitialized");
    }
}

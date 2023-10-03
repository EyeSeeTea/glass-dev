import React, { useEffect, useState } from "react";
import { SideBarContext, SideBarContextProps } from "../contexts/sidebar-modules-context";
import { useCurrentOrgUnitContext } from "../contexts/current-orgUnit-context";
import { useAppContext } from "../contexts/app-context";
import { GlassModule } from "../../domain/entities/GlassModule";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import i18n from "@eyeseetea/d2-ui-components/locales";

export const defaultState: SideBarContextProps = {
    accessibleModules: [],
    isLoading: false,
};

interface SideBarModulesProviderProps {
    children: React.ReactNode;
}

export const SideBarModulesContextProvider = ({ children }: SideBarModulesProviderProps) => {
    const { compositionRoot } = useAppContext();
    const [modules, setModules] = useState<GlassModule[]>(defaultState.accessibleModules);
    const [isLoading, setIsLoading] = useState(false);
    const {
        currentOrgUnitAccess: { orgUnitId },
    } = useCurrentOrgUnitContext();
    const snackbar = useSnackbar();

    useEffect(() => {
        setIsLoading(true);
        compositionRoot.glassModules.getAll(orgUnitId).run(
            modules => {
                setModules(modules);
                setIsLoading(false);
            },
            () => {
                snackbar.warning(i18n.t("Error fetching user Modules"));
            }
        );
    }, [compositionRoot.glassModules, orgUnitId, snackbar]);

    return (
        <SideBarContext.Provider value={{ accessibleModules: modules, isLoading }}>{children}</SideBarContext.Provider>
    );
};

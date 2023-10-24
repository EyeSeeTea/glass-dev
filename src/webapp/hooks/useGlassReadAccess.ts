import React, { useEffect } from "react";
import { GlassNews } from "../../domain/entities/GlassNews";
import { useCurrentModuleContext } from "../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../contexts/current-orgUnit-context";
import { GlassState } from "./State";
import { useSideBarModulesContext } from "../contexts/sidebar-modules-context";

export type GlassNewsState = GlassState<GlassNews[]>;

export function useGlassReadAccess() {
    const [hasReadAccess, setHasReadAccess] = React.useState<boolean>();

    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { accessibleModules, isLoading } = useSideBarModulesContext();

    useEffect(() => {
        //Only set the read access, after the module and org unit access have been set
        if (currentModuleAccess.moduleId !== "" && currentOrgUnitAccess.orgUnitId !== "" && !isLoading)
            setHasReadAccess(
                currentModuleAccess.readAccess &&
                    currentOrgUnitAccess.readAccess &&
                    accessibleModules.map(module => module.id).includes(currentModuleAccess.moduleId)
            );
    }, [
        accessibleModules,
        currentModuleAccess.moduleId,
        currentModuleAccess.readAccess,
        currentOrgUnitAccess.orgUnitId,
        currentOrgUnitAccess.readAccess,
        isLoading,
    ]);

    return hasReadAccess;
}

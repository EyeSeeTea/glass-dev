import React, { useEffect } from "react";
import { GlassNews } from "../../domain/entities/GlassNews";
import { useCurrentModuleContext } from "../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../contexts/current-orgUnit-context";
import { GlassState } from "./State";

export type GlassNewsState = GlassState<GlassNews[]>;

export function useGlassReadAccess() {
    const [hasReadAccess, setHasReadAccess] = React.useState<boolean>();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();

    useEffect(() => {
        //TO DO: add third condition for enrollment
        //Only set the read access, after the module and org unit access have been set
        if (currentModuleAccess.moduleId !== "" && currentOrgUnitAccess.orgUnitId !== "")
            setHasReadAccess(currentModuleAccess.readAccess && currentOrgUnitAccess.readAccess);
    }, [currentModuleAccess, currentOrgUnitAccess]);

    return hasReadAccess;
}

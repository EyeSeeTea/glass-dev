import React, { useEffect } from "react";
import { GlassNews } from "../../domain/entities/GlassNews";
import { useCurrentModuleContext } from "../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../contexts/current-orgUnit-context";
import { GlassState } from "./State";

export type GlassNewsState = GlassState<GlassNews[]>;

export function useGlassCaptureAccess() {
    const [hasCaptureAccess, setHasCaptureAccess] = React.useState<boolean>();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();

    useEffect(() => {
        //Only set the capture access, after the module and org unit access have been set
        if (currentModuleAccess.moduleId !== "" && currentOrgUnitAccess.orgUnitId !== "")
            setHasCaptureAccess(currentModuleAccess.captureAccess && currentOrgUnitAccess.captureAccess);
    }, [currentModuleAccess, currentOrgUnitAccess]);

    return hasCaptureAccess;
}

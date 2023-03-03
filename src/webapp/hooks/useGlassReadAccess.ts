import React, { useEffect } from "react";
import { GlassNews } from "../../domain/entities/GlassNews";
import { useCurrentModuleContext } from "../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../contexts/current-orgUnit-context";
import { GlassState } from "./State";

export type GlassNewsState = GlassState<GlassNews[]>;

export function useGlassReadAccess() {
    const [hasReadAccess, setHasReadAccess] = React.useState<boolean>();
    const {
        currentModuleAccess: { readAccess: moduleReadAccess, captureAccess: moduleCaptureAccess },
    } = useCurrentModuleContext();
    const {
        currentOrgUnitAccess: { readAccess: orgUnitReadAccess, captureAccess: orgUnitCaptureAccess },
    } = useCurrentOrgUnitContext();

    useEffect(() => {
        //TO DO: add third condition for enrollment
        setHasReadAccess(moduleReadAccess && orgUnitReadAccess);
    }, [moduleCaptureAccess, moduleReadAccess, orgUnitCaptureAccess, orgUnitReadAccess]);

    return hasReadAccess;
}

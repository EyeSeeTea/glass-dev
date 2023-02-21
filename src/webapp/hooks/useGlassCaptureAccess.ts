import React, { useEffect } from "react";
import { GlassNews } from "../../domain/entities/GlassNews";
import { useCurrentModuleContext } from "../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../contexts/current-orgUnit-context";
import { GlassState } from "./State";

export type GlassNewsState = GlassState<GlassNews[]>;

export function useGlassCaptureAccess() {
    const [hasCaptureAccess, setHasCaptureAccess] = React.useState<boolean>();
    const {
        currentModuleAccess: { captureAccess: moduleCaptureAccess },
    } = useCurrentModuleContext();
    const {
        currentOrgUnitAccess: { captureAccess: orgUnitCaptureAccess },
    } = useCurrentOrgUnitContext();

    console.log("currentModuleAccess:", useCurrentModuleContext().currentModuleAccess);
    console.log("currentOrgUnitAccess", useCurrentOrgUnitContext().currentOrgUnitAccess);

    useEffect(() => {
        setHasCaptureAccess(moduleCaptureAccess && orgUnitCaptureAccess);
    }, [moduleCaptureAccess, orgUnitCaptureAccess]);

    return hasCaptureAccess;
}

import React from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { GlassUploads } from "../../domain/entities/GlassUploads";
import { useCurrentModuleContext } from "../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../contexts/current-orgUnit-context";
import { GlassState } from "./State";

export type GlassUploadsState = GlassState<GlassUploads[]>;

export function useGlassUploads(compositionRoot: CompositionRoot) {
    const {
        currentModuleAccess: { moduleId },
    } = useCurrentModuleContext();
    const {
        currentOrgUnitAccess: { orgUnitId },
    } = useCurrentOrgUnitContext();

    const [result, setResult] = React.useState<GlassUploadsState>({
        kind: "loading",
    });

    React.useEffect(() => {
        compositionRoot.glassUploads.getByModuleOU(moduleId, orgUnitId).run(
            uploads => setResult({ kind: "loaded", data: uploads }),
            error => setResult({ kind: "error", message: error })
        );
    }, [compositionRoot, moduleId, orgUnitId]);

    return result;
}

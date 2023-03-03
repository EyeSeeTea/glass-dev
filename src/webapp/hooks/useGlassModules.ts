import React from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { GlassModule } from "../../domain/entities/GlassModule";
import { useCurrentOrgUnitContext } from "../contexts/current-orgUnit-context";
import { GlassState } from "./State";

export type GlassModulesState = GlassState<GlassModule[]>;

export function useGlassModules(compositionRoot: CompositionRoot) {
    const [result, setResult] = React.useState<GlassModulesState>({
        kind: "loading",
    });

    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();

    React.useEffect(() => {
        compositionRoot.glassModules.getAll(currentOrgUnitAccess.orgUnitId).run(
            modules => setResult({ kind: "loaded", data: modules }),
            error => setResult({ kind: "error", message: error })
        );
    }, [compositionRoot, currentOrgUnitAccess]);

    return result;
}

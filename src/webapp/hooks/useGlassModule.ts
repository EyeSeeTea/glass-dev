import React from "react";
import { GlassModule } from "../../domain/entities/GlassModule";
import { useAppContext } from "../contexts/app-context";
import { useCurrentModuleContext } from "../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../contexts/current-orgUnit-context";
import { GlassState } from "./State";

export type GlassModuleState = GlassState<GlassModule>;

export function useGlassModule() {
    const { compositionRoot } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const moduleName = currentModuleAccess.moduleName;

    const [result, setResult] = React.useState<GlassModuleState>({ kind: "loading" });

    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();

    React.useEffect(() => {
        if (moduleName) {
            compositionRoot.glassModules.getByName(currentOrgUnitAccess.orgUnitId, moduleName).run(
                module => setResult({ kind: "loaded", data: module }),
                error => setResult({ kind: "error", message: error })
            );
        }
    }, [compositionRoot, moduleName, currentOrgUnitAccess.orgUnitId]);

    return result;
}

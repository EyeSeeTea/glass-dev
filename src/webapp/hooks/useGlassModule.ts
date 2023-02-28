import React from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { GlassModule } from "../../domain/entities/GlassModule";
import { useCurrentModuleContext } from "../contexts/current-module-context";
import { GlassState } from "./State";

export type GlassModuleState = GlassState<GlassModule>;

export function useGlassModule(compositionRoot: CompositionRoot) {
    const { currentModuleAccess } = useCurrentModuleContext();
    const moduleName = currentModuleAccess.moduleName;

    const [result, setResult] = React.useState<GlassModuleState>({ kind: "loading" });

    React.useEffect(() => {
        if (moduleName) {
            compositionRoot.glassModules.getByName(moduleName).run(
                module => setResult({ kind: "loaded", data: module }),
                error => setResult({ kind: "error", message: error })
            );
        }
    }, [compositionRoot, moduleName]);

    return result;
}

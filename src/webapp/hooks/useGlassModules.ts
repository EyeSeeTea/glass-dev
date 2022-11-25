import React from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { GlassModule } from "../../domain/entities/GlassModule";
import { GlassState } from "./State";

export type GlassModulesState = GlassState<GlassModule[]>;

export function useGlassModules(compositionRoot: CompositionRoot) {
    const [result, setResult] = React.useState<GlassModulesState>({
        kind: "loading",
    });

    React.useEffect(() => {
        compositionRoot.glassModules.getAll().run(
            modules => setResult({ kind: "loaded", data: modules }),
            error => setResult({ kind: "error", message: error })
        );
    }, [compositionRoot]);

    return result;
}

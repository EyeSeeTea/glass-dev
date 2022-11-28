import React from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { GlassModule } from "../../domain/entities/GlassModule";
import { GlassState } from "./State";

export type GlassModuleState = GlassState<GlassModule>;

export function useGlassModule(compositionRoot: CompositionRoot, name: string) {
    const [result, setResult] = React.useState<GlassModuleState>({
        kind: "loading",
    });

    React.useEffect(() => {
        compositionRoot.glassModules.getByName(name).run(
            module => setResult({ kind: "loaded", data: module }),
            error => setResult({ kind: "error", message: error })
        );
    }, [compositionRoot, name]);

    return result;
}

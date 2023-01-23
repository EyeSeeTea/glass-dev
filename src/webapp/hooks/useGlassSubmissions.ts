import React from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { GlassSubmissions } from "../../domain/entities/GlassSubmissions";
import { GlassState } from "./State";

export type GlassSubmissionsState = GlassState<GlassSubmissions[]>;

export function useGlassSubmissions(compositionRoot: CompositionRoot) {
    const [result, setResult] = React.useState<GlassSubmissionsState>({
        kind: "loading",
    });

    React.useEffect(() => {
        compositionRoot.glassSubmissions.getAll().run(
            submissions => setResult({ kind: "loaded", data: submissions }),
            error => setResult({ kind: "error", message: error })
        );
    }, [compositionRoot]);

    return result;
}

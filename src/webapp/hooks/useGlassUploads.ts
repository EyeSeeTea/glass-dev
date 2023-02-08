import React from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { GlassUploads } from "../../domain/entities/GlassUploads";
import { GlassState } from "./State";

export type GlassUploadsState = GlassState<GlassUploads[]>;

export function useGlassUploads(compositionRoot: CompositionRoot) {
    const [result, setResult] = React.useState<GlassUploadsState>({
        kind: "loading",
    });

    React.useEffect(() => {
        compositionRoot.glassUploads.getAll().run(
            uploads => setResult({ kind: "loaded", data: uploads }),
            error => setResult({ kind: "error", message: error })
        );
    }, [compositionRoot]);

    return result;
}

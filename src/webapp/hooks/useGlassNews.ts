import React from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { GlassNews } from "../../domain/entities/GlassNews";
import { GlassState } from "./State";

export type GlassNewsState = GlassState<GlassNews[]>;

export function useGlassNews(compositionRoot: CompositionRoot) {
    const [result, setResult] = React.useState<GlassNewsState>({
        kind: "loading",
    });

    React.useEffect(() => {
        compositionRoot.glassNews.getAll().run(
            news => setResult({ kind: "loaded", data: news }),
            error => setResult({ kind: "error", message: error })
        );
    }, [compositionRoot]);

    return result;
}

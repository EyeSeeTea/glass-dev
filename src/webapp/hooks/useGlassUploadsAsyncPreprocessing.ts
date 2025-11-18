import React, { useCallback } from "react";
import { GlassState } from "./State";
import { useAppContext } from "../contexts/app-context";
import { AsyncPreprocessing } from "../../domain/entities/AsyncPreprocessing";

export type GlassAsyncPreprocessingState = GlassState<AsyncPreprocessing[]>;

type State = {
    asyncPreprocessing: GlassAsyncPreprocessingState;
    refreshAsyncPreprocessing: React.Dispatch<React.SetStateAction<{}>>;
};

export function useGlassUploadsAsyncPreprocessing(): State {
    const { compositionRoot } = useAppContext();

    const [asyncPreprocessing, setAsyncUploads] = React.useState<GlassAsyncPreprocessingState>({
        kind: "loading",
    });
    const [shouldRefresh, refreshAsyncPreprocessing] = React.useState({});

    const getAsyncPreprocessing = useCallback(() => {
        compositionRoot.glassUploads.getAsyncPreprocessing().run(
            uploads => setAsyncUploads({ kind: "loaded", data: uploads }),
            error => setAsyncUploads({ kind: "error", message: error })
        );
    }, [compositionRoot.glassUploads]);

    React.useEffect(() => {
        getAsyncPreprocessing();
    }, [getAsyncPreprocessing, shouldRefresh]);

    return {
        asyncPreprocessing,
        refreshAsyncPreprocessing,
    };
}

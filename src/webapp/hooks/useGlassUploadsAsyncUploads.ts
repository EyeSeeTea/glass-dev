import React, { useCallback } from "react";
import { GlassState } from "./State";
import { useAppContext } from "../contexts/app-context";
import { GlassAsyncUpload } from "../../domain/entities/GlassAsyncUploads";

export type GlassUploadsAsyncUploadsState = GlassState<GlassAsyncUpload[]>;

type State = {
    asyncUploads: GlassUploadsAsyncUploadsState;
    refreshAsyncUploads: React.Dispatch<React.SetStateAction<{}>>;
};

export function useGlassUploadsAsyncUploads(): State {
    const { compositionRoot } = useAppContext();

    const [asyncUploads, setAsyncUploads] = React.useState<GlassUploadsAsyncUploadsState>({
        kind: "loading",
    });
    const [shouldRefresh, refreshAsyncUploads] = React.useState({});

    const getAsyncUploads = useCallback(() => {
        compositionRoot.glassUploads.getAsyncUploads().run(
            uploads => setAsyncUploads({ kind: "loaded", data: uploads }),
            error => setAsyncUploads({ kind: "error", message: error })
        );
    }, [compositionRoot.glassUploads]);

    React.useEffect(() => {
        getAsyncUploads();
    }, [getAsyncUploads, shouldRefresh]);

    return {
        asyncUploads,
        refreshAsyncUploads,
    };
}

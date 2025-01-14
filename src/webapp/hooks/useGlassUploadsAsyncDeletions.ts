import React, { useCallback } from "react";
import { GlassState } from "./State";
import { useAppContext } from "../contexts/app-context";
import { Id } from "../../domain/entities/Ref";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { GlassAsyncDeletion } from "../../domain/entities/GlassAsyncDeletions";

export type GlassUploadsAsyncDeletionsState = GlassState<GlassAsyncDeletion[]>;

type State = {
    asyncDeletions: GlassUploadsAsyncDeletionsState;
    setToAsyncDeletions: (uploadIdsToDelete: Id[]) => void;
};

export function useGlassUploadsAsyncDeletions(): State {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();

    const [asyncDeletions, setAsyncDeletions] = React.useState<GlassUploadsAsyncDeletionsState>({
        kind: "loading",
    });

    const getAsyncDeletions = useCallback(() => {
        compositionRoot.glassUploads.getAsyncDeletions().run(
            deletions => setAsyncDeletions({ kind: "loaded", data: deletions }),
            error => setAsyncDeletions({ kind: "error", message: error })
        );
    }, [compositionRoot.glassUploads]);

    React.useEffect(() => {
        getAsyncDeletions();
    }, [getAsyncDeletions]);

    const setToAsyncDeletions = useCallback(
        (uploadIdsToDelete: Id[]) => {
            compositionRoot.glassUploads.setToAsyncDeletions(uploadIdsToDelete).run(
                () => {
                    snackbar.info(`File marked to be deleted`);
                    getAsyncDeletions();
                },
                error => {
                    snackbar.error(`Error setting file to be deleted, error : ${error} `);
                    console.error(error);
                }
            );
        },
        [compositionRoot.glassUploads, getAsyncDeletions, snackbar]
    );

    return {
        asyncDeletions,
        setToAsyncDeletions,
    };
}

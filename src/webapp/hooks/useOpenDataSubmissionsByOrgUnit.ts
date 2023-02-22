import { useEffect, useState } from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { GlassDataSubmission } from "../../domain/entities/GlassDataSubmission";
import { GlassState } from "./State";

type GlassDataSubmissionsState = GlassState<GlassDataSubmission[]>;

export function useOpenDataSubmissionsByOrgUnit(compositionRoot: CompositionRoot, orgUnit: string) {
    const [openDataSubmissions, setOpenDataSubmissions] = useState<GlassDataSubmissionsState>({
        kind: "loading",
    });

    useEffect(() => {
        compositionRoot.glassDataSubmission.getOpenDataSubmissionsByOU(orgUnit).run(
            openDataSubmissions => setOpenDataSubmissions({ kind: "loaded", data: openDataSubmissions }),
            error => setOpenDataSubmissions({ kind: "error", message: error })
        );
    }, [setOpenDataSubmissions, compositionRoot.glassDataSubmission, orgUnit]);

    return openDataSubmissions;
}

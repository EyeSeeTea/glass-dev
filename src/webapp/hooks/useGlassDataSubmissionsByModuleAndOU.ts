import { useEffect, useState } from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { GlassDataSubmission } from "../../domain/entities/GlassDataSubmission";
import { GlassState } from "./State";

type GlassDataSubmissionsState = GlassState<GlassDataSubmission[]>;

export function useGlassDataSubmissionsByModuleAndOU(
    compositionRoot: CompositionRoot,
    moduleId: string,
    orgUnit: string
) {
    const [dataSubmissions, setDataSubmissions] = useState<GlassDataSubmissionsState>({
        kind: "loading",
    });

    useEffect(() => {
        compositionRoot.glassDataSubmission.getDataSubmissionsByModuleAndOU(moduleId, orgUnit).run(
            dataSubmissionsByModule => setDataSubmissions({ kind: "loaded", data: dataSubmissionsByModule }),
            error => setDataSubmissions({ kind: "error", message: error })
        );
    }, [setDataSubmissions, compositionRoot.glassDataSubmission, moduleId, orgUnit]);

    return dataSubmissions;
}

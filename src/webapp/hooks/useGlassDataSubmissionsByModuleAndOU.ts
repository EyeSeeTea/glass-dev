import { useEffect, useState } from "react";
import { GlassDataSubmission } from "../../domain/entities/GlassDataSubmission";
import { useAppContext } from "../contexts/app-context";
import { GlassState } from "./State";

type GlassDataSubmissionsState = GlassState<GlassDataSubmission[]>;

export function useGlassDataSubmissionsByModuleAndOU(moduleId: string, orgUnit: string) {
    const { compositionRoot } = useAppContext();
    const [dataSubmissions, setDataSubmissions] = useState<GlassDataSubmissionsState>({
        kind: "loading",
    });
    const [refetch, setRefetch] = useState({});

    useEffect(() => {
        if (moduleId !== "" && orgUnit !== "")
            compositionRoot.glassDataSubmission.getDataSubmissionsByModuleAndOU(moduleId, orgUnit).run(
                dataSubmissionsByModule => {
                    setDataSubmissions({
                        kind: "loaded",
                        data: _.orderBy(dataSubmissionsByModule, ["period"], ["desc"]),
                    });
                },
                error => setDataSubmissions({ kind: "error", message: error })
            );
    }, [setDataSubmissions, compositionRoot.glassDataSubmission, moduleId, orgUnit, refetch]);

    return { dataSubmissions, setDataSubmissions, setRefetch };
}

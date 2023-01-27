import { useEffect, useState } from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { StatusDetails } from "../components/current-data-submission/overview/StatusDetails";
import { statusMap } from "../components/current-data-submission/StatusMap";
import { GlassState } from "./State";

type GlassDataSubmissionState = GlassState<StatusDetails>;

export function useStatusDataSubmission(
    compositionRoot: CompositionRoot,
    moduleId: string,
    orgUnit: string,
    period: number
) {
    const [dataSubmissionStatus, setDataSubmissionStatus] = useState<GlassDataSubmissionState>({
        kind: "loading",
    });

    useEffect(() => {
        compositionRoot.glassDataSubmission.getSpecificDataSubmission(moduleId, orgUnit, period).run(
            currentDataSubmission => {
                const dataSubmissionStatusDetails = statusMap.get(currentDataSubmission.status);
                if (dataSubmissionStatusDetails) setDataSubmissionStatus({ kind: "loaded", data: dataSubmissionStatusDetails });
            },
            error => {
                setDataSubmissionStatus({ kind: "error", message: error });
            }
        );
    }, [setDataSubmissionStatus, compositionRoot.glassDataSubmission, moduleId, orgUnit, period]);

    return dataSubmissionStatus;
}

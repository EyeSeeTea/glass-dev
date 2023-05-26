import { useEffect, useState } from "react";
import { DataSubmissionStatusTypes } from "../../domain/entities/GlassDataSubmission";
import { StatusDetails } from "../components/current-data-submission/overview/StatusDetails";
import { statusMap } from "../components/current-data-submission/StatusMap";
import { useAppContext } from "../contexts/app-context";
import { GlassState } from "./State";

type GlassDataSubmissionState = GlassState<StatusDetails>;

export function useStatusDataSubmission(
    moduleId: string,
    orgUnit: string,
    period: string,
    refetch: DataSubmissionStatusTypes | undefined = undefined
) {
    const { compositionRoot, currentUser } = useAppContext();
    const [dataSubmissionStatus, setDataSubmissionStatus] = useState<GlassDataSubmissionState>({
        kind: "loading",
    });

    useEffect(() => {
        const isQuarterlyModule = currentUser.quarterlyPeriodModules.find(m => m.id === moduleId) ? true : false;
        compositionRoot.glassDataSubmission.getSpecificDataSubmission(moduleId, orgUnit, period, isQuarterlyModule).run(
            currentDataSubmission => {
                const dataSubmissionStatusDetails = statusMap.get(currentDataSubmission.status);
                if (dataSubmissionStatusDetails)
                    setDataSubmissionStatus({ kind: "loaded", data: dataSubmissionStatusDetails });
            },
            error => {
                setDataSubmissionStatus({ kind: "error", message: error });
            }
        );
    }, [
        setDataSubmissionStatus,
        compositionRoot.glassDataSubmission,
        moduleId,
        orgUnit,
        period,
        refetch,
        currentUser.quarterlyPeriodModules,
    ]);

    return dataSubmissionStatus;
}

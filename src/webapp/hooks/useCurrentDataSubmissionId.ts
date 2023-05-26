import { useEffect, useState } from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { useAppContext } from "../contexts/app-context";

export function useCurrentDataSubmissionId(
    compositionRoot: CompositionRoot,
    moduleId: string,
    orgUnit: string,
    period: string
) {
    const { currentUser } = useAppContext();
    const [currentDataSubmissionId, setCurrentDataSubmissionId] = useState<string>("");

    useEffect(() => {
        async function getDataSubmission() {
            const isQuarterlyModule = currentUser.quarterlyPeriodModules.find(m => m.id === moduleId) ? true : false;
            const currentDataSubmission = await compositionRoot.glassDataSubmission
                .getSpecificDataSubmission(moduleId, orgUnit, period, isQuarterlyModule)
                .toPromise();
            setCurrentDataSubmissionId(currentDataSubmission.id);
        }
        getDataSubmission();
    }, [compositionRoot.glassDataSubmission, moduleId, orgUnit, period, currentUser.quarterlyPeriodModules]);

    return currentDataSubmissionId;
}

import { useEffect, useState } from "react";
import { useAppContext } from "../contexts/app-context";

export function useCurrentDataSubmissionId(moduleId: string, moduleName: string, orgUnit: string, period: string) {
    const { currentUser, compositionRoot } = useAppContext();
    const [currentDataSubmissionId, setCurrentDataSubmissionId] = useState<string>("");

    useEffect(() => {
        async function getDataSubmission() {
            const isQuarterlyModule = currentUser.quarterlyPeriodModules.find(m => m.id === moduleId) ? true : false;
            const currentDataSubmission = await compositionRoot.glassDataSubmission
                .getSpecificDataSubmission(moduleId, moduleName, orgUnit, period, isQuarterlyModule)
                .toPromise();
            setCurrentDataSubmissionId(currentDataSubmission.id);
        }
        getDataSubmission();
    }, [
        compositionRoot.glassDataSubmission,
        moduleId,
        moduleName,
        orgUnit,
        period,
        currentUser.quarterlyPeriodModules,
    ]);

    return currentDataSubmissionId;
}

import { useEffect, useState } from "react";
import { useAppContext } from "../contexts/app-context";
import { useSnackbar } from "@eyeseetea/d2-ui-components";

export function useCurrentDataSubmissionId(moduleId: string, moduleName: string, orgUnit: string, period: string) {
    const { currentUser, compositionRoot } = useAppContext();
    const [currentDataSubmissionId, setCurrentDataSubmissionId] = useState<string>("");
    const snackbar = useSnackbar();

    useEffect(() => {
        const isQuarterlyModule = currentUser.quarterlyPeriodModules.find(m => m.id === moduleId) ? true : false;
        compositionRoot.glassDataSubmission
            .getSpecificDataSubmission(moduleId, moduleName, orgUnit, period, isQuarterlyModule)
            .run(
                currentDataSubmission => {
                    setCurrentDataSubmissionId(currentDataSubmission.id);
                },
                error => {
                    snackbar.error("Error fetching data submission : " + error);
                }
            );
    }, [
        compositionRoot.glassDataSubmission,
        moduleId,
        moduleName,
        orgUnit,
        period,
        currentUser.quarterlyPeriodModules,
        snackbar,
    ]);

    return currentDataSubmissionId;
}

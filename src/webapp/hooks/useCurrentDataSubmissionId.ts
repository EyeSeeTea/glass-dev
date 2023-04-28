import { useEffect, useState } from "react";
import { CompositionRoot } from "../../CompositionRoot";

export function useCurrentDataSubmissionId(
    compositionRoot: CompositionRoot,
    moduleId: string,
    orgUnit: string,
    period: string
) {
    const [currentDataSubmissionId, setCurrentDataSubmissionId] = useState<string>("");

    useEffect(() => {
        async function getDataSubmission() {
            const currentDataSubmission = await compositionRoot.glassDataSubmission
                .getSpecificDataSubmission(moduleId, orgUnit, period)
                .toPromise();
            setCurrentDataSubmissionId(currentDataSubmission.id);
        }
        getDataSubmission();
    }, [compositionRoot.glassDataSubmission, moduleId, orgUnit, period]);

    return currentDataSubmissionId;
}

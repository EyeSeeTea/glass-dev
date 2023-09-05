import { useEffect, useState } from "react";
import { useAppContext } from "../../../contexts/app-context";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { useCurrentModuleContext } from "../../../contexts/current-module-context";
import { useGlassDataSubmissionsByModuleAndOU } from "../../../hooks/useGlassDataSubmissionsByModuleAndOU";
import { getLastNYears, getLastNYearsQuarters } from "../../../../utils/currentPeriodHelper";
import { moduleProperties } from "../../../../domain/utils/ModuleProperties";

export function usePopulateDataSubmissionHistory() {
    const { compositionRoot } = useAppContext();
    const { currentUser } = useAppContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { dataSubmissions, setDataSubmissions, setRefetch } = useGlassDataSubmissionsByModuleAndOU(
        currentModuleAccess.moduleId,
        currentOrgUnitAccess.orgUnitId
    );
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (dataSubmissions.kind === "loaded") {
            //Ensure that the last n years of data submissions are pre populated.
            const years: string[] = [];

            if (currentUser.quarterlyPeriodModules.find(qm => qm.name === currentModuleAccess.moduleName)) {
                //Check if last 2 years Quarterly Data Submissions are populated
                getLastNYearsQuarters().forEach(quarter => {
                    if (!dataSubmissions.data.find(ds => ds.period === quarter)) {
                        years.push(quarter);
                    }
                });
            } else {
                //Check if Data Submissions history is populated
                const addCurrentYear =
                    moduleProperties.get(currentModuleAccess.moduleName)?.populateCurrentYearInHistory || false;
                getLastNYears(addCurrentYear).forEach(year => {
                    if (!dataSubmissions.data.find(ds => ds.period === year)) {
                        years.push(year);
                    }
                });
            }

            if (years.length && currentModuleAccess.moduleId !== "" && currentOrgUnitAccess.orgUnitId !== "") {
                setLoading(true);
                compositionRoot.glassDataSubmission
                    .saveDataSubmissions(currentModuleAccess.moduleId, currentOrgUnitAccess.orgUnitId, years)
                    .run(
                        () => {
                            setLoading(false);
                            setRefetch({});
                        },
                        () => {
                            setLoading(false);
                        }
                    );
            }
        }
    }, [
        compositionRoot.glassDataSubmission,
        currentModuleAccess.moduleId,
        currentModuleAccess.moduleName,
        currentOrgUnitAccess.orgUnitId,
        currentUser.quarterlyPeriodModules,
        dataSubmissions,
        setRefetch,
    ]);

    return { loading, dataSubmissions, setDataSubmissions };
}

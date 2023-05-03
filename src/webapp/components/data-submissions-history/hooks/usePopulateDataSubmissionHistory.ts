import { useEffect, useState } from "react";
import { useAppContext } from "../../../contexts/app-context";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { useCurrentModuleContext } from "../../../contexts/current-module-context";
import { useGlassDataSubmissionsByModuleAndOU } from "../../../hooks/useGlassDataSubmissionsByModuleAndOU";
import {
    getCurrentOpenPeriodByModule,
    getLastNYears,
    getLastNYearsQuarters,
} from "../../../../utils/currentPeriodHelper";

export function usePopulateDataSubmissionHistory() {
    const { compositionRoot } = useAppContext();
    const { currentUser } = useAppContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { dataSubmissions, setRefetch } = useGlassDataSubmissionsByModuleAndOU(
        currentModuleAccess.moduleId,
        currentOrgUnitAccess.orgUnitId
    );
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (dataSubmissions.kind === "loaded") {
            //Ensure that the last 5 years of data submissions are pre populated.
            const currentOpenPeriod = getCurrentOpenPeriodByModule(
                currentModuleAccess.moduleName,
                currentUser.quarterlyPeriodModules
            );
            const years: string[] = [];

            if (currentOpenPeriod.includes("Q")) {
                //Check if last 2 years Quarterly Data Submissions are populated
                getLastNYearsQuarters(2).forEach(quarter => {
                    if (!dataSubmissions.data.find(ds => ds.period === quarter)) {
                        years.push(quarter);
                    }
                });
            } else {
                //Check if last 5 Yearly Data Submissions are populated

                getLastNYears(5).forEach(year => {
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

    return { loading, dataSubmissions };
}

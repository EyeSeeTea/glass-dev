import { useState, useEffect } from "react";
import { DataSubmissionsTable } from "./DataSubmissionsTable";
import { useGlassDataSubmissionsByModuleAndOU } from "../../hooks/useGlassDataSubmissionsByModuleAndOU";
import { ContentLoader } from "../content-loader/ContentLoader";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useAppContext } from "../../contexts/app-context";
import { Backdrop } from "@material-ui/core";
import { StyledCircularProgress } from "../sidebar/SideBar";
import { getCurrentYear } from "../../../utils/currentPeriodHelper";

export const DataSubmissionsHistoryContent: React.FC = () => {
    const { compositionRoot } = useAppContext();
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
            const presentYear = getCurrentYear();
            const years: string[] = [];

            if (currentModuleAccess.moduleName === "EGASP") {
                if (!dataSubmissions.data.find(ds => ds.period === `${(presentYear - 1).toString()}Q1`)) {
                    years.push(`${(presentYear - 1).toString()}Q1`);
                }
                if (!dataSubmissions.data.find(ds => ds.period === `${(presentYear - 1).toString()}Q2`)) {
                    years.push(`${(presentYear - 1).toString()}Q2`);
                }
                if (!dataSubmissions.data.find(ds => ds.period === `${(presentYear - 1).toString()}Q3`)) {
                    years.push(`${(presentYear - 1).toString()}Q3`);
                }
                if (!dataSubmissions.data.find(ds => ds.period === `${(presentYear - 1).toString()}Q4`)) {
                    years.push(`${(presentYear - 1).toString()}Q4`);
                }
            } else {
                for (let yearItr = presentYear - 1; yearItr > presentYear - 6; yearItr--) {
                    if (!dataSubmissions.data.find(ds => ds.period === yearItr.toString())) {
                        years.push(yearItr.toString());
                    }
                }
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
        dataSubmissions,
        setRefetch,
    ]);

    return (
        <ContentLoader content={dataSubmissions}>
            <Backdrop open={loading} style={{ color: "#fff", zIndex: 1 }}>
                <StyledCircularProgress color="inherit" size={30} />
            </Backdrop>

            {dataSubmissions.kind === "loaded" && <DataSubmissionsTable items={dataSubmissions.data} />}
        </ContentLoader>
    );
};

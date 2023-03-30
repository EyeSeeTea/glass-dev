import { useState, useEffect } from "react";
import { DataSubmissionsTable } from "./DataSubmissionsTable";
import { useGlassDataSubmissionsByModuleAndOU } from "../../hooks/useGlassDataSubmissionsByModuleAndOU";
import { ContentLoader } from "../content-loader/ContentLoader";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useAppContext } from "../../contexts/app-context";
import { Backdrop } from "@material-ui/core";
import { StyledCircularProgress } from "../sidebar/SideBar";

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
            const presentYear = new Date().getFullYear();
            const years: number[] = [];

            for (let yearItr = presentYear - 1; yearItr > presentYear - 6; yearItr--) {
                if (!dataSubmissions.data.find(ds => ds.period === yearItr)) {
                    years.push(yearItr);
                }
            }

            if (years.length) {
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

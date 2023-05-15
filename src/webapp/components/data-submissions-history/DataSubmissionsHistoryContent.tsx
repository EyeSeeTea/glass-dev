import { useState, useEffect } from "react";
import { DataSubmissionsTable } from "./DataSubmissionsTable";
import { useGlassDataSubmissionsByModuleAndOU } from "../../hooks/useGlassDataSubmissionsByModuleAndOU";
import { ContentLoader } from "../content-loader/ContentLoader";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useAppContext } from "../../contexts/app-context";
import { Backdrop } from "@material-ui/core";
import { StyledCircularProgress } from "../sidebar/SideBar";
import { SortDirection } from "../data-file-history/DataFileTable";

export const DataSubmissionsHistoryContent: React.FC = () => {
    const { compositionRoot } = useAppContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { dataSubmissions, setDataSubmissions, setRefetch } = useGlassDataSubmissionsByModuleAndOU(
        currentModuleAccess.moduleId,
        currentOrgUnitAccess.orgUnitId
    );

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (dataSubmissions.kind === "loaded") {
            //Ensure that the last 5 years of data submissions are pre populated.
            const presentYear = new Date().getFullYear();
            const years: string[] = [];

            for (let yearItr = presentYear - 1; yearItr > presentYear - 6; yearItr--) {
                if (!dataSubmissions.data.find(ds => ds.period === yearItr.toString())) {
                    years.push(yearItr.toString());
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
        currentOrgUnitAccess.orgUnitId,
        dataSubmissions,
        setRefetch,
    ]);

    const sortByColumn = (columnName: string, sortDirection: SortDirection) => {
        setDataSubmissions(prevDataSubmissions => {
            if (prevDataSubmissions.kind === "loaded") {
                return { kind: "loaded", data: _.orderBy(prevDataSubmissions.data, columnName, sortDirection) };
            } else return prevDataSubmissions;
        });
    };
    return (
        <ContentLoader content={dataSubmissions}>
            <Backdrop open={loading} style={{ color: "#fff", zIndex: 1 }}>
                <StyledCircularProgress color="inherit" size={30} />
            </Backdrop>

            {dataSubmissions.kind === "loaded" && (
                <DataSubmissionsTable items={dataSubmissions.data} sortByColumn={sortByColumn} />
            )}
        </ContentLoader>
    );
};

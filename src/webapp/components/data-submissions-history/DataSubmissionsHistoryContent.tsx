import { DataSubmissionsTable } from "./DataSubmissionsTable";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppContext } from "../../contexts/app-context";
import { useGlassDataSubmissionsByModuleAndOU } from "../../hooks/useGlassDataSubmissionsByModuleAndOU";
import { ContentLoader } from "../content-loader/ContentLoader";

interface DataSubmissionsHistoryContentProps {
    moduleName: string;
    moduleId: string;
}

export const DataSubmissionsHistoryContent: React.FC<DataSubmissionsHistoryContentProps> = ({
    moduleId,
    moduleName,
}) => {
    const { compositionRoot } = useAppContext();
    const location = useLocation();
    const queryParameters = new URLSearchParams(location.search);
    //TO DO : The orgUnit should come from a global context which is yet to be implemented.
    const orgUnitVal = queryParameters.get("orgUnit");
    const [orgUnit] = useState(orgUnitVal === null ? "" : orgUnitVal);
    const dataSubmissions = useGlassDataSubmissionsByModuleAndOU(compositionRoot, moduleId, orgUnit);

    return (
        <ContentLoader content={dataSubmissions}>
            {dataSubmissions.kind === "loaded" && (
                <DataSubmissionsTable items={dataSubmissions.data} moduleName={moduleName} orgUnit={orgUnit} />
            )}
        </ContentLoader>
    );
};

import { DataSubmissionsTable } from "./DataSubmissionsTable";
import { useGlassDataSubmissionsByModuleAndOU } from "../../hooks/useGlassDataSubmissionsByModuleAndOU";
import { ContentLoader } from "../content-loader/ContentLoader";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useCurrentModuleContext } from "../../contexts/current-module-context";

export const DataSubmissionsHistoryContent: React.FC = () => {
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const dataSubmissions = useGlassDataSubmissionsByModuleAndOU(
        currentModuleAccess.moduleId,
        currentOrgUnitAccess.orgUnitId
    );

    return (
        <ContentLoader content={dataSubmissions}>
            {dataSubmissions.kind === "loaded" && <DataSubmissionsTable items={dataSubmissions.data} />}
        </ContentLoader>
    );
};

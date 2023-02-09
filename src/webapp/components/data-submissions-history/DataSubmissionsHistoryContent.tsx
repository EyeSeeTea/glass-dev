import { DataSubmissionsTable } from "./DataSubmissionsTable";
import { useAppContext } from "../../contexts/app-context";
import { useGlassDataSubmissionsByModuleAndOU } from "../../hooks/useGlassDataSubmissionsByModuleAndOU";
import { ContentLoader } from "../content-loader/ContentLoader";
import { useCurrentAccessContext } from "../../contexts/current-access-context";

interface DataSubmissionsHistoryContentProps {
    moduleName: string;
    moduleId: string;
}

export const DataSubmissionsHistoryContent: React.FC<DataSubmissionsHistoryContentProps> = ({
    moduleId,
    moduleName,
}) => {
    const { compositionRoot } = useAppContext();
    const { currentOrgUnitAccess } = useCurrentAccessContext();
    const dataSubmissions = useGlassDataSubmissionsByModuleAndOU(compositionRoot, moduleId, currentOrgUnitAccess.id);

    return (
        <ContentLoader content={dataSubmissions}>
            {dataSubmissions.kind === "loaded" && (
                <DataSubmissionsTable
                    items={dataSubmissions.data}
                    moduleName={moduleName}
                    orgUnit={currentOrgUnitAccess.id}
                />
            )}
        </ContentLoader>
    );
};

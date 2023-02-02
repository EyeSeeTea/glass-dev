import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppContext } from "../../contexts/app-context";
import { useGlassCallsByModuleAndOU } from "../../hooks/useGlassCallsByModuleAndOU";
import { ContentLoader } from "../content-loader/ContentLoader";

import { CallsTable } from "./CallsTable";

interface CallsHistoryContentProps {
    moduleName: string;
    moduleId: string;
}

export const CallsHistoryContent: React.FC<CallsHistoryContentProps> = ({ moduleId, moduleName }) => {
    const { compositionRoot } = useAppContext();
    const location = useLocation();
    const queryParameters = new URLSearchParams(location.search);
    //TO DO : The orgUnit should come from a global context which is yet to be implemented.
    const orgUnitVal = queryParameters.get("orgUnit");
    const [orgUnit] = useState(orgUnitVal === null ? "" : orgUnitVal);
    const calls = useGlassCallsByModuleAndOU(compositionRoot, moduleId, orgUnit);

    return (
        <ContentLoader content={calls}>
            {calls.kind === "loaded" && <CallsTable items={calls.data} moduleName={moduleName} orgUnit={orgUnit} />}
        </ContentLoader>
    )
};

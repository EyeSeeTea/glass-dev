import { Typography } from "@material-ui/core";
import { CircularProgress } from "material-ui";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppContext } from "../../contexts/app-context";
import { useGlassCallsByModuleAndOU } from "../../hooks/useGlassCallsByModuleAndOU";

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
    const [orgUnit, setOrgUnit] = useState(orgUnitVal === null ? "" : orgUnitVal);

    const calls = useGlassCallsByModuleAndOU(compositionRoot, moduleId, orgUnit);

    //TO DO : Use global content loader component after its been implemented.
    switch (calls.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            return <Typography variant="h6">{calls.message}</Typography>;
        case "loaded":
            return (
                <>
                    <CallsTable items={calls.data} moduleName={moduleName} orgUnit={orgUnit} />
                </>
            );
    }
};

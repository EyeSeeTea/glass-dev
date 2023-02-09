import { useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useAppContext } from "../../contexts/app-context";
import { useCurrentAccessContext } from "../../contexts/current-access-context";

export const GlobalQueryParamHandler: React.FC = props => {
    const location = useLocation();
    const queryParameters = new URLSearchParams(location.search);
    const orgUnitQueryParam = queryParameters.get("orgUnit");
    const history = useHistory();

    const { currentUser } = useAppContext();
    const { currentOrgUnitAccess, changeCurrentOrgUnitAccess } = useCurrentAccessContext();

    useEffect(() => {
        if (orgUnitQueryParam === null && currentOrgUnitAccess.id !== "") {
            queryParameters.set("orgUnit", currentOrgUnitAccess.id);
            history.push({ search: queryParameters.toString() });
        } else if (orgUnitQueryParam !== null && orgUnitQueryParam !== currentOrgUnitAccess.id) {
            const newCurrentOrgUnit = currentUser.userOrgUnitsAccess.find(ou => ou.id === orgUnitQueryParam);
            if (newCurrentOrgUnit) changeCurrentOrgUnitAccess(newCurrentOrgUnit);
        }
    });

    return <>{props.children}</>;
};

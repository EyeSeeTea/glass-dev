import { useCallback, useEffect, useMemo, useState } from "react";
import { OrgUnitAccess } from "../../domain/entities/User";
import { useHistory, useLocation } from "react-router-dom";
import { CurrentOrgUnitContext, defaultOrgUnitContextState } from "../contexts/current-orgUnit-context";
import { useAppContext } from "../contexts/app-context";

export const CurrentOrgUnitContextProvider: React.FC = ({ children }) => {
    const history = useHistory();
    const location = useLocation();
    const queryParameters = useMemo(() => new URLSearchParams(location.search), [location]);
    const orgUnitQueryParam = queryParameters.get("orgUnit");

    const { currentUser } = useAppContext();

    const [currentOrgUnitAccess, setCurrentOrgUnitAccess] = useState<OrgUnitAccess>(
        defaultOrgUnitContextState.currentOrgUnitAccess
    );

    const changeCurrentOrgUnitAccess = useCallback(
        (updated: OrgUnitAccess) => {
            setCurrentOrgUnitAccess(updated);
            if (queryParameters.get("orgUnit")) {
                queryParameters.set("orgUnit", updated.id);
                history.push({ search: queryParameters.toString() });
            }
        },
        [history, queryParameters]
    );

    useEffect(() => {
        //If the org unit param has not yet been set, set it.
        if (orgUnitQueryParam === null && currentOrgUnitAccess.id !== "") {
            queryParameters.set("orgUnit", currentOrgUnitAccess.id);
            history.push({ search: queryParameters.toString() });
        }
        //If user has manually changed the url, then update the orgUnit context with it.
        else if (orgUnitQueryParam !== null && orgUnitQueryParam !== currentOrgUnitAccess.id) {
            const newCurrentOrgUnit = currentUser.userOrgUnitsAccess.find(ou => ou.id === orgUnitQueryParam);
            if (newCurrentOrgUnit) changeCurrentOrgUnitAccess(newCurrentOrgUnit);
        }
    }, [
        changeCurrentOrgUnitAccess,
        currentOrgUnitAccess.id,
        currentUser.userOrgUnitsAccess,
        history,
        orgUnitQueryParam,
        queryParameters,
    ]);

    return (
        <CurrentOrgUnitContext.Provider
            value={{
                currentOrgUnitAccess,
                changeCurrentOrgUnitAccess,
            }}
        >
            {children}
        </CurrentOrgUnitContext.Provider>
    );
};

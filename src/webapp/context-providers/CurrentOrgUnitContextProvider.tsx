import { useCallback, useEffect, useState } from "react";
import { OrgUnitAccess } from "../../domain/entities/User";
import { useHistory, useLocation } from "react-router-dom";
import { CurrentOrgUnitContext, defaultOrgUnitContextState } from "../contexts/current-orgUnit-context";
import { useAppContext } from "../contexts/app-context";
import { setupLogger } from "../../utils/logger";

export const CurrentOrgUnitContextProvider: React.FC = ({ children }) => {
    const history = useHistory();
    const location = useLocation();
    const orgUnitQueryParam = new URLSearchParams(location.search).get("orgUnit");

    const { currentUser, instance } = useAppContext();

    //Set default org unit to the first org unit in list
    const defaultOrgUnit: OrgUnitAccess = currentUser.userOrgUnitsAccess[0]
        ? currentUser.userOrgUnitsAccess[0]
        : defaultOrgUnitContextState.currentOrgUnitAccess;
    const [currentOrgUnitAccess, setCurrentOrgUnitAccess] = useState<OrgUnitAccess>(defaultOrgUnit);

    const changeCurrentOrgUnitAccess = useCallback(
        (updatedOrgUnit: string) => {
            const currentOrgUnitAccess = currentUser.userOrgUnitsAccess.find(ou => ou.orgUnitId === updatedOrgUnit);

            if (currentOrgUnitAccess) {
                setCurrentOrgUnitAccess(currentOrgUnitAccess);
                if (orgUnitQueryParam) {
                    const queryParameters = new URLSearchParams(location.search);
                    queryParameters.set("orgUnit", currentOrgUnitAccess.orgUnitId);
                    history.replace({ search: queryParameters.toString() });
                }
            }
        },
        [history, location.search, currentUser.userOrgUnitsAccess, orgUnitQueryParam]
    );

    useEffect(() => {
        //If the org unit param has not yet been set, set it.
        if (orgUnitQueryParam === null && currentOrgUnitAccess.orgUnitId !== "") {
            const queryParameters = new URLSearchParams(location.search);
            queryParameters.set("orgUnit", currentOrgUnitAccess.orgUnitId);
            history.replace({ search: queryParameters.toString() });
        }
        //If user has manually changed the url, then update the orgUnit context with it.
        else if (orgUnitQueryParam !== null && orgUnitQueryParam !== currentOrgUnitAccess.orgUnitId) {
            changeCurrentOrgUnitAccess(orgUnitQueryParam);
        }
    }, [
        changeCurrentOrgUnitAccess,
        currentOrgUnitAccess.orgUnitId,
        currentUser.userOrgUnitsAccess,
        history,
        location.search,
        orgUnitQueryParam,
    ]);

    useEffect(() => {
        // TODO: logger in each org unit? By now all in global org unit
        async function setupLoggerWithCurrentOrgUnit() {
            await setupLogger(instance);
        }
        setupLoggerWithCurrentOrgUnit();
    }, [instance]);

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

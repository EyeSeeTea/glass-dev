import { useEffect, useState, useMemo, useCallback } from "react";
import { UserGroupAccess } from "../../domain/entities/User";
import { useHistory, useLocation } from "react-router-dom";
import { defaultModuleContextState, CurrentModuleContext } from "../contexts/current-module-context";

import { useAppContext } from "../contexts/app-context";

export const CurrentModuleContextProvider: React.FC = ({ children }) => {
    const history = useHistory();
    const location = useLocation();
    const queryParameters = useMemo(() => new URLSearchParams(location.search), [location]);
    const moduleQueryParam = queryParameters.get("module");
    const { currentUser } = useAppContext();

    const [currentModuleAccess, setCurrentModuleAccess] = useState<UserGroupAccess>(
        defaultModuleContextState.currentModuleAccess
    );

    const changeCurrentModuleAccess = useCallback(
        (updated: UserGroupAccess) => {
            setCurrentModuleAccess(updated);
            if (queryParameters.get("module")) {
                queryParameters.set("module", updated.moduleName);
                history.push({ search: queryParameters.toString() });
            }
        },
        [history, queryParameters]
    );

    useEffect(() => {
        //If the module query parameter has not yet been set, set it.
        if (moduleQueryParam === null && currentModuleAccess.moduleName !== "") {
            queryParameters.set("module", currentModuleAccess.moduleName);
            history.push({ search: queryParameters.toString() });
        }
        //If user has manually changed the url, then update the orgUnit context with it.
        else if (moduleQueryParam !== null && moduleQueryParam !== currentModuleAccess.moduleName) {
            const newCurrentModule = currentUser.userModulesAccess.find(
                module => module.moduleName === moduleQueryParam
            );
            if (newCurrentModule) changeCurrentModuleAccess(newCurrentModule);
        }
    }, [
        changeCurrentModuleAccess,
        currentUser.userModulesAccess,
        currentModuleAccess.moduleName,
        history,
        moduleQueryParam,
        queryParameters,
    ]);

    return (
        <CurrentModuleContext.Provider
            value={{
                currentModuleAccess,
                changeCurrentModuleAccess,
            }}
        >
            {children}
        </CurrentModuleContext.Provider>
    );
};

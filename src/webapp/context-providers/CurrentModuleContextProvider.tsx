import { useEffect, useState, useMemo, useCallback } from "react";
import { ModuleAccess } from "../../domain/entities/User";
import { useHistory, useLocation } from "react-router-dom";
import { defaultModuleContextState, CurrentModuleContext } from "../contexts/current-module-context";

import { useAppContext } from "../contexts/app-context";

export const CurrentModuleContextProvider: React.FC = ({ children }) => {
    const history = useHistory();
    const location = useLocation();
    const queryParameters = useMemo(() => new URLSearchParams(location.search), [location]);
    const moduleQueryParam = queryParameters.get("module");
    const { currentUserModulesAccess } = useAppContext();

    const [currentModuleAccess, setCurrentModuleAccess] = useState<ModuleAccess>(
        defaultModuleContextState.currentModuleAccess
    );

    const changeCurrentModuleAccess = useCallback(
        (updated: string) => {
            const currentModuleAccess = currentUserModulesAccess?.find(m => m.moduleName === updated);
            if (currentModuleAccess) {
                setCurrentModuleAccess(currentModuleAccess);
                if (queryParameters.get("module")) {
                    queryParameters.set("module", currentModuleAccess.moduleName);
                    history.replace({ search: queryParameters.toString() });
                }
            }
        },
        [history, queryParameters, currentUserModulesAccess]
    );

    const resetCurrentModuleAccess = () => {
        setCurrentModuleAccess(defaultModuleContextState.currentModuleAccess);
        queryParameters.delete("module");
    };

    useEffect(() => {
        //If the module query parameter has not yet been set, set it.
        if (moduleQueryParam === null && currentModuleAccess.moduleName !== "") {
            queryParameters.set("module", currentModuleAccess.moduleName);
            history.replace({ search: queryParameters.toString() });
        }
        //If user has manually changed the url, then update the orgUnit context with it.
        else if (moduleQueryParam !== null && moduleQueryParam !== currentModuleAccess.moduleName) {
            changeCurrentModuleAccess(moduleQueryParam);
        }
    }, [changeCurrentModuleAccess, currentModuleAccess.moduleName, history, moduleQueryParam, queryParameters]);

    return (
        <CurrentModuleContext.Provider
            value={{
                currentModuleAccess,
                changeCurrentModuleAccess,
                resetCurrentModuleAccess,
            }}
        >
            {children}
        </CurrentModuleContext.Provider>
    );
};

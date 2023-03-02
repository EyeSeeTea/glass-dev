import { useEffect, useState, useCallback } from "react";
import { ModuleAccess } from "../../domain/entities/User";
import { useHistory, useLocation } from "react-router-dom";
import { defaultModuleContextState, CurrentModuleContext } from "../contexts/current-module-context";

import { useAppContext } from "../contexts/app-context";

export const CurrentModuleContextProvider: React.FC = ({ children }) => {
    const history = useHistory();
    const location = useLocation();
    const moduleQueryParam = new URLSearchParams(location.search).get("module");
    const { currentUser } = useAppContext();

    const [currentModuleAccess, setCurrentModuleAccess] = useState<ModuleAccess>(
        defaultModuleContextState.currentModuleAccess
    );

    const changeCurrentModuleAccess = useCallback(
        (updated: string) => {
            const currentModuleAccess = currentUser.userModulesAccess?.find(m => m.moduleName === updated);
            if (currentModuleAccess) {
                setCurrentModuleAccess(currentModuleAccess);
                if (moduleQueryParam) {
                    const queryParameters = new URLSearchParams(location.search);
                    queryParameters.set("module", currentModuleAccess.moduleName);
                    history.replace({ search: queryParameters.toString() });
                }
            }
        },
        [history, location.search, currentUser.userModulesAccess, moduleQueryParam]
    );

    const resetCurrentModuleAccess = () => {
        setCurrentModuleAccess(defaultModuleContextState.currentModuleAccess);
        const queryParameters = new URLSearchParams(location.search);
        queryParameters.delete("module");
    };

    useEffect(() => {
        //If the module query parameter has not yet been set, set it.
        if (moduleQueryParam === null && currentModuleAccess.moduleName !== "") {
            const queryParameters = new URLSearchParams(location.search);
            queryParameters.set("module", currentModuleAccess.moduleName);
            history.replace({ search: queryParameters.toString() });
        }
        //If user has manually changed the url, then update the orgUnit context with it.
        else if (moduleQueryParam !== null && moduleQueryParam !== currentModuleAccess.moduleName) {
            changeCurrentModuleAccess(moduleQueryParam);
        }
    }, [
        changeCurrentModuleAccess,
        currentUser.userModulesAccess,
        currentModuleAccess.moduleName,
        history,
        location.search,
        moduleQueryParam,
    ]);

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

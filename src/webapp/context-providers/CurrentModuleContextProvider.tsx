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
    const { currentUser } = useAppContext();

    const [currentModuleAccess, setCurrentModuleAccess] = useState<ModuleAccess>(
        defaultModuleContextState.currentModuleAccess
    );

    const [userModulesAccess, setUserModulesAccess] = useState<ModuleAccess[] | undefined>(undefined);

    const changeCurrentModuleAccess = useCallback(
        (updated: string) => {
            const currentModuleAccess = userModulesAccess?.find(m => m.moduleName === updated);
            if (currentModuleAccess) {
                setCurrentModuleAccess(currentModuleAccess);
                if (queryParameters.get("module")) {
                    queryParameters.set("module", currentModuleAccess.moduleName);
                    history.replace({ search: queryParameters.toString() });
                }
            }
        },
        [history, queryParameters, userModulesAccess]
    );

    const resetCurrentModuleAccess = () => {
        setCurrentModuleAccess(defaultModuleContextState.currentModuleAccess);
        queryParameters.delete("module");
    };

    useEffect(() => {
        async function initModuleAccess() {
            const { data: moduleAccessList } = await currentUser.userModulesAccess.runAsync();
            if (moduleAccessList) setUserModulesAccess(moduleAccessList);
        }
        //Since userModulesAccess is a Future, fetch and initilize module access asynchronously.
        if (!userModulesAccess) {
            initModuleAccess();
        }
        //If the module query parameter has not yet been set, set it.
        if (moduleQueryParam === null && currentModuleAccess.moduleName !== "") {
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
        moduleQueryParam,
        queryParameters,
        userModulesAccess,
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

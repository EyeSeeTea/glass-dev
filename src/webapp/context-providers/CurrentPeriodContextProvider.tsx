import { useCallback, useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { CurrentPeriodContext } from "../contexts/current-period-context";

import { useAppContext } from "../contexts/app-context";
import { useCurrentModuleContext } from "../contexts/current-module-context";

export const CurrentPeriodContextProvider: React.FC = ({ children }) => {
    const history = useHistory();
    const location = useLocation();
    const periodQueryParam = new URLSearchParams(location.search).get("period");
    const { currentUser } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();

    const getCurrentOpenPeriodByModule = (moduleName: string) => {
        const today = new Date();
        if (currentUser.quarterlyPeriodModules.find(qm => qm.name === moduleName)) {
            const currentQuarter = Math.floor((today.getMonth() + 3) / 3);
            if (currentQuarter !== 1) return `${today.getFullYear()}Q${currentQuarter - 1}`;
            else return `${today.getFullYear() - 1}Q4`;
        } else {
            return `${today.getFullYear() - 1}`;
        }
    };

    //The default period is always the previous calendar year.
    const defaultPeriod = getCurrentOpenPeriodByModule(currentModuleAccess.moduleName);

    const [currentPeriod, setCurrentPeriod] = useState(defaultPeriod);

    const isValidCurrentPeriod = useCallback(
        (updatedPeriod: string) => {
            //is a QUARTERLY module
            if (
                currentUser.quarterlyPeriodModules.find(qm => qm.name === currentModuleAccess.moduleName) &&
                RegExp(/^\d{4}Q[1-4]$/).test(updatedPeriod)
            ) {
                return true;
            } //is a YEARLY module
            else if (
                !currentUser.quarterlyPeriodModules.find(qm => qm.name === currentModuleAccess.moduleName) &&
                new RegExp(/^\d{4}$/).test(updatedPeriod)
            ) {
                return true;
            } else {
                return false;
            }
        },
        [currentModuleAccess.moduleName, currentUser.quarterlyPeriodModules]
    );

    const changeCurrentPeriod = useCallback(
        (updatedPeriod: string) => {
            setCurrentPeriod(updatedPeriod);
            if (periodQueryParam) {
                const queryParameters = new URLSearchParams(location.search);
                queryParameters.set("period", updatedPeriod.toString());
                history.replace({ search: queryParameters.toString() });
            }
        },
        [history, location.search, periodQueryParam]
    );

    useEffect(() => {
        //If the period param has not yet been set, set it.
        if (periodQueryParam === null) {
            const queryParameters = new URLSearchParams(location.search);
            queryParameters.set("period", currentPeriod.toString());
            history.replace({ search: queryParameters.toString() });
        }
        //If user has manually changed the url, then update the period context with it.
        else if (
            periodQueryParam !== null &&
            periodQueryParam !== currentPeriod &&
            isValidCurrentPeriod(periodQueryParam)
        ) {
            changeCurrentPeriod(periodQueryParam);
        }
    }, [changeCurrentPeriod, currentPeriod, history, location.search, periodQueryParam, isValidCurrentPeriod]);

    return (
        <CurrentPeriodContext.Provider
            value={{
                currentPeriod: currentPeriod,
                changeCurrentPeriod: changeCurrentPeriod,
                getCurrentOpenPeriodByModule: getCurrentOpenPeriodByModule,
            }}
        >
            {children}
        </CurrentPeriodContext.Provider>
    );
};

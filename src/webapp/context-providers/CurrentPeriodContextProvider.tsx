import { useCallback, useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { CurrentPeriodContext } from "../contexts/current-period-context";

import { useAppContext } from "../contexts/app-context";

export const CurrentPeriodContextProvider: React.FC = ({ children }) => {
    const history = useHistory();
    const location = useLocation();
    const periodQueryParam = new URLSearchParams(location.search).get("period");
    const { currentUser } = useAppContext();

    const getCurrentOpenPeriodByModule = (module: string) => {
        const today = new Date();
        if (currentUser.quarterlyPeriodModules.find(qm => qm === module)) {
            const currentQuarter = Math.floor((today.getMonth() + 3) / 3);
            if (currentQuarter !== 1) return `${today.getFullYear()}Q${currentQuarter - 1}`;
            else return `${today.getFullYear() - 1}Q4`;
        } else {
            return `${today.getFullYear() - 1}`;
        }
    };

    //The default period is always the previous calendar year.
    const defaultPeriod = getCurrentOpenPeriodByModule("");

    const [currentPeriod, setCurrentPeriod] = useState(defaultPeriod);

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
        else if (periodQueryParam !== null && periodQueryParam !== currentPeriod) {
            changeCurrentPeriod(periodQueryParam);
        }
    }, [changeCurrentPeriod, currentPeriod, history, location.search, periodQueryParam]);

    return (
        <CurrentPeriodContext.Provider
            value={{
                currentPeriod: currentPeriod,
                changeCurrentPeriod: changeCurrentPeriod,
                getCurrentOpenPeriodByModule: getCurrentOpenPeriodByModule
            }}
        >
            {children}
        </CurrentPeriodContext.Provider>
    );
};

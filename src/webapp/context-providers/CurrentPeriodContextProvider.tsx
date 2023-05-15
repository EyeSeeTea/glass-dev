import { useCallback, useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { CurrentPeriodContext } from "../contexts/current-period-context";

export const CurrentPeriodContextProvider: React.FC = ({ children }) => {
    const history = useHistory();
    const location = useLocation();
    const periodQueryParam = new URLSearchParams(location.search).get("period");

    //The default period is always the previous calendar year.
    const defaultPeriod = `${new Date().getFullYear() - 1}`;

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
            }}
        >
            {children}
        </CurrentPeriodContext.Provider>
    );
};

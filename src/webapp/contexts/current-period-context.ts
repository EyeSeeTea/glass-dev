import { createContext, useContext } from "react";
import { getCurrentOpenYearlyPeriod } from "../../utils/currentPeriodHelper";

export interface CurrentPeriodContextState {
    currentPeriod: string;
    changeCurrentPeriod: (period: string) => void;
    getCurrentOpenPeriodByModule: (module: string) => string;
}

export const defaultPeriodContextState = {
    currentPeriod: getCurrentOpenYearlyPeriod(), //The default period is always the previous calendar year.
    changeCurrentPeriod: () => {},
    getCurrentOpenPeriodByModule: () => {
        return "";
    },
};

export const CurrentPeriodContext = createContext<CurrentPeriodContextState>(defaultPeriodContextState);

export function useCurrentPeriodContext() {
    const context = useContext(CurrentPeriodContext);
    if (context) {
        return context;
    } else {
        throw new Error("Current Period Context uninitialized");
    }
}

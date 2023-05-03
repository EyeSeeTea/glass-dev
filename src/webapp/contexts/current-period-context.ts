import { createContext, useContext } from "react";
import { getCurrentOpenPeriodByModule } from "../../utils/currentPeriodHelper";

export interface CurrentPeriodContextState {
    currentPeriod: string;
    changeCurrentPeriod: (period: string) => void;
}

export const defaultPeriodContextState = {
    currentPeriod: getCurrentOpenPeriodByModule("", []), //The default period is always the previous calendar year.
    changeCurrentPeriod: () => {},
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

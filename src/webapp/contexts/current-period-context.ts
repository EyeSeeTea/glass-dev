import { createContext, useContext } from "react";

export interface CurrentPeriodContextState {
    currentPeriod: number;
    changeCurrentPeriod: (period: number) => void;
}

export const defaultPeriodContextState = {
    currentPeriod: new Date().getFullYear() - 1, //The default period is always the previous calendar year.
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

import React from "react";
import { GlassState } from "./State";
import { useAppContext } from "../contexts/app-context";
import { Signal } from "../../domain/entities/Signal";

export type SignalsState = GlassState<Signal[]>;

export function useSignals() {
    const { compositionRoot } = useAppContext();
    const [signals, setSignals] = React.useState<SignalsState>({
        kind: "loading",
    });

    React.useEffect(() => {
        compositionRoot.signals.getSignals().run(
            signals => setSignals({ kind: "loaded", data: signals }),
            error => setSignals({ kind: "error", message: error })
        );
    }, [compositionRoot]);

    return signals;
}

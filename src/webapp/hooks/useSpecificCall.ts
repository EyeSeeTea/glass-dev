import { useEffect, useState } from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { CallStatusTypes } from "../../domain/entities/GlassCallStatus";
import { GlassState } from "./State";

type GlassCallState = GlassState<CallStatusTypes>;

export function useSpecificCall(compositionRoot: CompositionRoot, moduleId: string, orgUnit: string, period: number) {
    const [call, setCall] = useState<GlassCallState>({
        kind: "loading",
    });

    useEffect(() => {
        compositionRoot.glassCall.getSpecificCall(moduleId, orgUnit, period).run(
            currentCall => {
                //If calls are filtered on module && orgunit && period, then only one call should be returned,
                //if more are returned, its an error in call data modelling.
                if (currentCall.length === 1 && currentCall[0]) {
                    setCall({ kind: "loaded", data: currentCall[0]?.status });
                } else {
                    //Specific call not found,
                    //Set to default status- NOT_COMPLETE, so that user can continue with submission workflow
                    setCall({
                        kind: "loaded",
                        data: "NOT_COMPLETED",
                    });
                }
            },
            error => {
                setCall({ kind: "error", message: error });
            }
        );
    }, [setCall, compositionRoot.glassCall, moduleId, orgUnit, period]);

    return call;
}

import { useEffect, useState } from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { StatusDetails } from "../components/current-call/overview/StatusDetails";
import { statusMap } from "../components/current-call/StatusMap";
import { GlassState } from "./State";

type GlassCallState = GlassState<StatusDetails>;

export function useStatusCall(compositionRoot: CompositionRoot, moduleId: string, orgUnit: string, period: number) {
    const [callStatus, setCallStatus] = useState<GlassCallState>({
        kind: "loading",
    });

    useEffect(() => {
        compositionRoot.glassCall.getSpecificCall(moduleId, orgUnit, period).run(
            currentCall => {
                const callStatusDetails = statusMap.get(currentCall.status);
                if (callStatusDetails) setCallStatus({ kind: "loaded", data: callStatusDetails });
            },
            error => {
                setCallStatus({ kind: "error", message: error });
            }
        );
    }, [setCallStatus, compositionRoot.glassCall, moduleId, orgUnit, period]);

    return callStatus;
}

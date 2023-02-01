import { useEffect, useState } from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { GlassCall } from "../../domain/entities/GlassCallStatus";
import { GlassState } from "./State";

type GlassCallsState = GlassState<GlassCall[]>;

export function useGlassCallsByModuleAndOU(compositionRoot: CompositionRoot, moduleId: string, orgUnit: string) {
    const [calls, setCalls] = useState<GlassCallsState>({
        kind: "loading",
    });

    useEffect(() => {
        compositionRoot.glassCall.getCallsByModuleAndOU(moduleId, orgUnit).run(
            callsByModule => setCalls({ kind: "loaded", data: callsByModule }),
            error => setCalls({ kind: "error", message: error })
        );
    }, [setCalls, compositionRoot.glassCall, moduleId, orgUnit]);

    return calls;
}

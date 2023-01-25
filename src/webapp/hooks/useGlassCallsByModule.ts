import { useEffect, useState } from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { GlassCall } from "../../domain/entities/GlassCallStatus";
import { GlassState } from "./State";

type GlassCallsState = GlassState<GlassCall[]>;

export function useGlassCallsByModule(compositionRoot: CompositionRoot, moduleId: string) {
    const [calls, setCalls] = useState<GlassCallsState>({
        kind: "loading",
    });

    useEffect(() => {
        compositionRoot.glassCall.getCallsByModule(moduleId).run(
            callsByModule => setCalls({ kind: "loaded", data: callsByModule }),
            error => setCalls({ kind: "error", message: error })
        );
    }, [setCalls, compositionRoot.glassCall, moduleId]);

    return calls;
}

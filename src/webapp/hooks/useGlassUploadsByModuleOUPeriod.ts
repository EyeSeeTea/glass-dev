import React from "react";
import { GlassUploads } from "../../domain/entities/GlassUploads";
import { useAppContext } from "../contexts/app-context";
import { useCurrentModuleContext } from "../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../contexts/current-orgUnit-context";
import { GlassState } from "./State";

export type GlassUploadsState = GlassState<GlassUploads[]>;

export function useGlassUploadsByModuleOUPeriod(period: string) {
    const { compositionRoot } = useAppContext();
    const {
        currentModuleAccess: { moduleId },
    } = useCurrentModuleContext();
    const {
        currentOrgUnitAccess: { orgUnitId },
    } = useCurrentOrgUnitContext();

    const [uploads, setUploads] = React.useState<GlassUploadsState>({
        kind: "loading",
    });

    const [shouldRefresh, refreshUploads] = React.useState({});

    React.useEffect(() => {
        compositionRoot.glassUploads.getByModuleOUPeriod(moduleId, orgUnitId, period).run(
            uploads => setUploads({ kind: "loaded", data: uploads }),
            error => setUploads({ kind: "error", message: error })
        );
    }, [compositionRoot, moduleId, orgUnitId, shouldRefresh, period]);

    return { uploads, refreshUploads };
}

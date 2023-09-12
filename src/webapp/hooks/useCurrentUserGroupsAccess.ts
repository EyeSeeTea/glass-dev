import React from "react";
import { useCurrentModuleContext } from "../contexts/current-module-context";
import { GlassState } from "./State";
import { useAppContext } from "../contexts/app-context";
import { UserGroup } from "../../domain/entities/User";

export type GlassModuleState = GlassState<UserGroup[]>;

export function useCurrentUserGroupsAccess() {
    const { compositionRoot } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();

    const [approveAccessGroup, setApproveAccessGroup] = React.useState<GlassModuleState>({ kind: "loading" });
    const [captureAccessGroup, setCaptureAccessGroup] = React.useState<GlassModuleState>({ kind: "loading" });
    const [readAccessGroup, setReadAccessGroup] = React.useState<GlassModuleState>({ kind: "loading" });
    const [confidentialAccessGroup, setConfidentialAccessGroup] = React.useState<GlassModuleState>({ kind: "loading" });

    React.useEffect(() => {
        compositionRoot.glassModules.getById(currentModuleAccess.moduleId).run(
            glassModule => {
                if (glassModule.userGroups.captureAccess) {
                    setCaptureAccessGroup({ kind: "loaded", data: glassModule.userGroups.captureAccess });
                }
                if (glassModule.userGroups.readAccess) {
                    setReadAccessGroup({ kind: "loaded", data: glassModule.userGroups.readAccess });
                }
                if (glassModule.userGroups.approveAccess) {
                    setApproveAccessGroup({ kind: "loaded", data: glassModule.userGroups.approveAccess });
                }
                if (glassModule.userGroups.confidentialAccess) {
                    setConfidentialAccessGroup({ kind: "loaded", data: glassModule.userGroups.confidentialAccess });
                }
            },
            () => {}
        );
    }, [compositionRoot, currentModuleAccess.moduleId]);

    return { approveAccessGroup, captureAccessGroup, readAccessGroup, confidentialAccessGroup };
}

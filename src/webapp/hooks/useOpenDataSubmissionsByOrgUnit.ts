import { useEffect, useState } from "react";
import { GlassDataSubmission } from "../../domain/entities/GlassDataSubmission";
import { GlassModule } from "../../domain/entities/GlassModule";
import { GlassState } from "./State";
import { useAppContext } from "../contexts/app-context";
import { useCurrentOrgUnitContext } from "../contexts/current-orgUnit-context";
import { useSideBarModulesContext } from "../contexts/sidebar-modules-context";

type GlassDataSubmissionsState = GlassState<GlassDataSubmissionData[]>;

type GlassDataSubmissionData = {
    dataSubmission: GlassDataSubmission;
    module?: GlassModule;
};

const openDataSubmissionStatuses = ["NOT_COMPLETED", "COMPLETE", "REJECTED", "UPDATE_REQUEST_ACCEPTED"];

export function useOpenDataSubmissionsByOrgUnit() {
    const { compositionRoot } = useAppContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { accessibleModules, isLoading } = useSideBarModulesContext();
    const [openDataSubmissions, setOpenDataSubmissions] = useState<GlassDataSubmissionsState>({
        kind: "loading",
    });

    useEffect(() => {
        if (!isLoading) {
            compositionRoot.glassDataSubmission.getOpenDataSubmissionsByOU(currentOrgUnitAccess.orgUnitId).run(
                openDataSubmissions => {
                    const submissions = openDataSubmissions
                        .filter(data => data.module !== undefined && openDataSubmissionStatuses.includes(data.status))
                        .map(openDataSubmission => {
                            const module = accessibleModules.find(module => openDataSubmission.module === module.id);

                            return { dataSubmission: openDataSubmission, module };
                        });

                    setOpenDataSubmissions({ kind: "loaded", data: submissions });
                },
                error => setOpenDataSubmissions({ kind: "error", message: error })
            );
        }
    }, [accessibleModules, compositionRoot.glassDataSubmission, currentOrgUnitAccess.orgUnitId, isLoading]);

    return openDataSubmissions;
}

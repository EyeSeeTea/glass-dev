import { useEffect, useState } from "react";
import { CompositionRoot } from "../../CompositionRoot";
import { GlassDataSubmission } from "../../domain/entities/GlassDataSubmission";
import { GlassModule } from "../../domain/entities/GlassModule";
import { GlassState } from "./State";
import { useGlassModules } from "./useGlassModules";

type GlassDataSubmissionsState = GlassState<GlassDataSubmissionData[]>;

type GlassDataSubmissionData = {
    dataSubmission: GlassDataSubmission;
    module?: GlassModule;
};

const openDataSubmissionStatuses = ["NOT_COMPLETED", "COMPLETE", "REJECTED", "UPDATE_REQUEST_ACCEPTED"];

export function useOpenDataSubmissionsByOrgUnit(compositionRoot: CompositionRoot, orgUnit: string) {
    const modules = useGlassModules(compositionRoot);
    const [openDataSubmissions, setOpenDataSubmissions] = useState<GlassDataSubmissionsState>({
        kind: "loading",
    });

    useEffect(() => {
        if (modules.kind === "loaded") {
            compositionRoot.glassDataSubmission.getOpenDataSubmissionsByOU(orgUnit).run(
                openDataSubmissions => {
                    const submissions = openDataSubmissions
                        .filter(data => data.module !== undefined && openDataSubmissionStatuses.includes(data.status))
                        .map(openDataSubmission => {
                            const module = modules.data.find(module => openDataSubmission.module === module.id);

                            return { dataSubmission: openDataSubmission, module };
                        });

                    setOpenDataSubmissions({ kind: "loaded", data: submissions });
                },
                error => setOpenDataSubmissions({ kind: "error", message: error })
            );
        }
    }, [setOpenDataSubmissions, compositionRoot.glassDataSubmission, orgUnit, modules]);

    return openDataSubmissions;
}

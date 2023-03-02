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
                        .map(openDataSubmission => {
                            const module = modules.data.find(module => openDataSubmission.module === module.id);

                            return { dataSubmission: openDataSubmission, module };
                        })
                        .filter(data => data.module !== undefined);

                    setOpenDataSubmissions({ kind: "loaded", data: submissions });
                },
                error => setOpenDataSubmissions({ kind: "error", message: error })
            );
        }
    }, [setOpenDataSubmissions, compositionRoot.glassDataSubmission, orgUnit, modules]);

    return openDataSubmissions;
}

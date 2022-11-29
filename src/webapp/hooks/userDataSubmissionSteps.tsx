import { CompositionRoot } from "../../CompositionRoot";
import { GlassModule } from "../../domain/entities/GlassModule";
import { Menu } from "../components/sidebar-nav/SidebarNav";
import { GlassState } from "./State";
import { useGlassModules } from "./useGlassModules";
import { DataSubmissionWizard } from "../components/data-submission/DataSubmissionNav";

export type GlassModulesState = GlassState<Menu[]>;

export function useDataSubmissionSteps(compositionRoot: CompositionRoot) {
    const modulesResult = useGlassModules(compositionRoot);

    return modulesResult.kind === "loaded"
        ? { kind: "loaded" as const, data: modulesResult.data.map(mapModuleToDataSubmissionSteps) }
        : modulesResult;
}

function mapModuleToDataSubmissionSteps(module: GlassModule): DataSubmissionWizard {
    return {
        moduleName: module.name,
        children: [
            {
                stepNumber: 1,
                title: "Upload Data",
                content:
                    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur consectetur dui eget est aliquet, sit amet euismod nibh iaculis. Etiam ut metus nec nunc gravida porttitor.",
            },
            {
                stepNumber: 2,
                title: "Review Data Summary",
                content:
                    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur consectetur dui eget est aliquet, sit amet euismod nibh iaculis. Etiam ut metus nec nunc gravida porttitor.",
            },
            {
                stepNumber: 3,
                title: "Consistency Checks",
                content:
                    "Explaining what consistency checks are: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore",
            },
            {
                stepNumber: 4,
                title: "Completed",
                content:
                    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur consectetur dui eget est aliquet, sit amet euismod nibh iaculis. Etiam ut metus nec nunc gravida porttitor.",
            },
        ],
    };
}

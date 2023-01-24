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
        moduleColor: module.color,
        children: [
            {
                stepNumber: 1,
                title: "Upload Data",
                content:
                    "One Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur consectetur dui eget est aliquet, sit amet euismod nibh iaculis. Etiam ut metus nec nunc gravida porttitor.",
            },
            {
                stepNumber: 2,
                title: "Review Data Summary",
                content:
                    "Vestibulum vulputate massa eu tellus egestas feugiat. Maecenas non dapibus quam. Nam suscipit imperdiet tincidunt. Nullam nec massa quis nulla dapibus porta. Maecenas blandit fringilla lacinia. Integer a mi vel tortor iaculis egestas dapibus ac mauris. Praesent sodales ultricies scelerisque.",
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
                    "Integer pharetra ligula a lectus viverra volutpat. Donec nec lacus dictum, facilisis ipsum in, imperdiet ex. Duis in mollis eros. Nulla facilisi. Etiam tincidunt tincidunt libero at pretium.",
            },
        ],
    };
}

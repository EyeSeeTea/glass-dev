import { CompositionRoot } from "../../CompositionRoot";
import { GlassModule } from "../../domain/entities/GlassModule";
import { Menu } from "../components/sidebar-nav/SidebarNav";
import { GlassState } from "./State";
import { useGlassModules } from "./useGlassModules";
import FolderIcon from "@material-ui/icons/Folder";

export type GlassModulesState = GlassState<Menu[]>;

export function useSidebarMenus(compositionRoot: CompositionRoot) {
    const modulesResult = useGlassModules(compositionRoot);

    return modulesResult.kind === "loaded"
        ? { kind: "loaded" as const, data: modulesResult.data.map(mapModuleToMenu) }
        : modulesResult;
}

function mapModuleToMenu(module: GlassModule): Menu {
    return {
        kind: "MenuGroup",
        level: 0,
        title: module.name,
        icon: <FolderIcon htmlColor={module.color} />,
        children: [
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Current Call",
                path: `/current-call/${module.name}`,
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Reports",
                path: "",
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Upload History",
                path: "",
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Calls History",
                path: "",
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Country Information",
                path: "",
            },
        ],
    };
}

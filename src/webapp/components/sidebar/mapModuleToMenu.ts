import { GlassModule } from "../../../domain/entities/GlassModule";
import { GlassState } from "../../hooks/State";
import { Menu } from "../sidebar-nav/SidebarNav";

export type GlassModulesState = GlassState<Menu[]>;

export function mapModuleToMenu(module: GlassModule): Menu {
    const moduleName = module.name;
    return {
        kind: "MenuGroup",
        level: 0,
        title: module.name,
        moduleColor: module.color,
        icon: "folder",
        children: [
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Current Call",
                path: `/current-call/?module=${moduleName}`,
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
                path: `/upload-history/?module=${moduleName}`,
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Calls History",
                path: `/calls-history/?module=${moduleName}`,
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Country Information",
                path: `/country-information/?module=${moduleName}`,
            },
        ],
    };
}

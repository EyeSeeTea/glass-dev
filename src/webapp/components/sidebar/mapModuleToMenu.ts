import { GlassModule } from "../../../domain/entities/GlassModule";
import { GlassState } from "../../hooks/State";
import { Menu } from "../sidebar-nav/SidebarNav";

export type GlassModulesState = GlassState<Menu[]>;

export function mapModuleToMenu(module: GlassModule): Menu {
    return {
        kind: "MenuGroup",
        level: 0,
        title: module.name,
        prettyName: module.prettyName,
        moduleColor: module.color,
        icon: "folder",
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
                path: `/upload-history/${module.name}`,
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Calls History",
                path: `/calls-history/${module.name}`,
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Country Information",
                path: `/country-information/${module.name}`,
            },
        ],
    };
}

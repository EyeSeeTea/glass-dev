import { GlassModule } from "../../../domain/entities/GlassModule";
import { GlassState } from "../../hooks/State";
import { Menu } from "../sidebar-nav/SidebarNav";

export type GlassModulesState = GlassState<Menu[]>;

export function mapModuleToMenu(module: GlassModule): Menu {
    // const moduleFolder = module.name.toLowerCase().replace(/\s/g,'');
    const moduleFolder = module.name;
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
                title: "Current Data Submission",
                path: `/current-data-submission/${moduleFolder}`,
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
                path: `/upload-history/${moduleFolder}`,
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Data Submissions History",
                path: `/data-submissions-history/${moduleFolder}`,
            },
            {
                kind: "MenuLeaf",
                level: 0,
                title: "Country Information",
                path: `/country-information/${moduleFolder}`,
            },
        ],
    };
}

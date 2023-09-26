import { GlassModule } from "../../../domain/entities/GlassModule";
import { GlassState } from "../../hooks/State";
import { Menu } from "../sidebar-nav/SidebarNav";

export type GlassModulesState = GlassState<Menu[]>;

export function mapModuleToMenu(module: GlassModule): Menu {
    if (module.name === "EAR") {
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
                    title: "Signals ",
                    path: `/signals`,
                },
                {
                    kind: "MenuLeaf",
                    level: 0,
                    title: "Draft a new signal",
                    path: `/new-signal`,
                },
            ],
        };
    } else {
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
                    path: `/current-data-submission`,
                },

                {
                    kind: "MenuLeaf",
                    level: 0,
                    title: "Reports",
                    path: `/reports`,
                },
                {
                    kind: "MenuLeaf",
                    level: 0,
                    title: "Data File History",
                    path: `/data-file-history`,
                },
                {
                    kind: "MenuLeaf",
                    level: 0,
                    title: "Data Submissions History",
                    path: `/data-submissions-history`,
                },
                {
                    kind: "MenuLeaf",
                    level: 0,
                    title: "Country Information",
                    path: `/country-information`,
                },
            ],
        };
    }
}

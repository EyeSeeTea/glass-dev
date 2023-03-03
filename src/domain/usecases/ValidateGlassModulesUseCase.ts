import { UseCase } from "../../CompositionRoot";
import { glassColors } from "../../webapp/pages/app/themes/dhis2.theme";
import { Future, FutureData } from "../entities/Future";
import { GlassModule } from "../entities/GlassModule";
import { GlassModuleRepository } from "../repositories/GlassModuleRepository";

const glassModules: GlassModule[] = [
    {
        id: "AVnpk4xiXGG",
        name: "AMR",
        color: glassColors.lightSecondary,
        userGroups: {
            readAccess: [],
            captureAccess: [],
        },
        questionnaires: [],
        consistencyChecks: {
            specimenPathogen: {
                BLOOD: ["ACISPP", "ESCCOL", "KLEPNE", "PSEAER", "STAAUR", "STRPNE", "SALSPP", "SALTYP", "SALPAR"],
                CSF: ["STRPNE", "NEIGON", "HAEINF"],
                URINE: ["ESCCOL", "KLEPNE"],
                STOOL: ["SALSPP", "SHISPP"],
                LOWRESP: ["STRPNE", "HAEINF", "STAAUR", "ACISPP", "ESCCOL", "KLEPNE", "PSEAER"],
                UROGENITAL: ["NEIGON"],
                ANORECTAL: ["NEIGON"],
                PHARYNGEAL: ["NEIGON"],
            },
        },
    },
    {
        id: "BVnik5xiXGJ",
        name: "AMC",
        color: glassColors.lightTertiary,
        userGroups: {
            readAccess: [],
            captureAccess: [],
        },
        questionnaires: [],
    },
    {
        id: "CVVp44xiXGJ",
        name: "EGASP",
        color: glassColors.lightPrimary,
        userGroups: {
            readAccess: [],
            captureAccess: [],
        },
        questionnaires: [],
    },
];

export class ValidateGlassModulesUseCase implements UseCase {
    constructor(private glassModuleRepository: GlassModuleRepository) {}

    public execute(): FutureData<void> {
        return this.glassModuleRepository
            .getAll()
            .flatMap(data =>
                data.length === 0 ? this.glassModuleRepository.save(glassModules) : Future.success(undefined)
            );
    }
}

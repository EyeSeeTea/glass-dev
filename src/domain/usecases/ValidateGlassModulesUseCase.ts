import { UseCase } from "../../CompositionRoot";
import { glassColors } from "../../webapp/pages/app/themes/dhis2.theme";
import { Future, FutureData } from "../entities/Future";
import { GlassModuleRepository } from "../repositories/GlassModuleRepository";

const glassModules = [
    {
        id: "AVnpk4xiXGG",
        name: "AMR",
        color: glassColors.lightSecondary,
        userGroups: {
            readAccess: [],
            captureAccess: [],
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
    },
    {
        id: "CVVp44xiXGJ",
        name: "EGASP",
        color: glassColors.lightPrimary,
        userGroups: {
            readAccess: [],
            captureAccess: [],
        },
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

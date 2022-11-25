import { UseCase } from "../../CompositionRoot";
import { glassColors } from "../../webapp/pages/app/themes/dhis2.theme";
import { Future, FutureData } from "../entities/Future";
import { GlassModuleRepository } from "../repositories/GlassModuleRepository";

const glassModules = [
    {
        name: "AMR",
        color: glassColors.lightSecondary,
    },
    {
        name: "AMC",
        color: glassColors.lightTertiary,
    },
    {
        name: "EGASP",
        color: glassColors.lightPrimary,
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

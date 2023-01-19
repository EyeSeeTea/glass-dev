import { UseCase } from "../../CompositionRoot";
import { glassColors } from "../../webapp/pages/app/themes/dhis2.theme";
import { Future, FutureData } from "../entities/Future";
import { GlassModuleRepository } from "../repositories/GlassModuleRepository";

const glassModules = [
    {
        name: "AMR",
        prettyName: "AMR",
        color: glassColors.lightSecondary,
    },
    {
        name: "AMC",
        prettyName: "AMC",
        color: glassColors.lightTertiary,
    },
    {
        name: "EGASP",
        prettyName: "EGASP",
        color: glassColors.lightPrimary,
    },
    {
        name: "AMR-INDIVIDUAL",
        prettyName: "AMR - Individual",
        color: glassColors.lightPrimary,
    },
    {
        name: "AMR-FUNGI",
        prettyName: "AMR - Funghi",
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

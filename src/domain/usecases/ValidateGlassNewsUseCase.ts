import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { GlassNewsRepository } from "../repositories/GlassNewsRepository";

const glassNews = [
    {
        title: "New Platform",
        description: "This is a platform for global data sharing on antimicrobial resistance worldwide.",
        createdOn: new Date("2021-01-10T00:00:00.000Z"),
    },
    {
        title: "Maintenance shutdown",
        description: "Nunc auctor purus",
        createdOn: new Date("2021-01-10T00:00:00.000Z"),
    },
    {
        title: "Nunc auctor purus at mi luctus facilisis",
        description: "Aenean fringilla risus a est ultricies laoreet.",
        createdOn: new Date("2021-01-10T00:00:00.000Z"),
    },
];

export class ValidateGlassNewsUseCase implements UseCase {
    constructor(private glassModuleRepository: GlassNewsRepository) {}

    public execute(): FutureData<void> {
        return this.glassModuleRepository
            .getAll()
            .flatMap(data =>
                data.length === 0 ? this.glassModuleRepository.save(glassNews) : Future.success(undefined)
            );
    }
}

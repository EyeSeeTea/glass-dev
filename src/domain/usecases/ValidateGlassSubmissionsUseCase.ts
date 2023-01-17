import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { GlassSubmissionsRepository } from "../repositories/GlassSubmissionsRepository";

const glassSubmissions = [
    {
        id: "1",
        module: "AVnpk4xiXGG",
        batchId: "Data set 1",
        countryCode: "DZA",
        downloadUrl: "",
        endDate: new Date("2021-01-10T00:00:00.000Z"),
        fileName: "DZA2010RIS.txt",
        fileType: "RIS",
        inputLineNb: 250,
        outputLineNb: 100,
        period: 2022,
        specimens: ["Blood", "Stool"],
        startDate: new Date("2021-01-10T00:00:00.000Z"),
        status: "Done",
        submissionDate: new Date("2021-01-10T00:00:00.000Z"),
    },
];

export class ValidateGlassSubmissionsUseCase implements UseCase {
    constructor(private glassModuleRepository: GlassSubmissionsRepository) {}

    public execute(): FutureData<void> {
        return this.glassModuleRepository
            .getAll()
            .flatMap(data =>
                data.length === 0 ? this.glassModuleRepository.save(glassSubmissions) : Future.success(undefined)
            );
    }
}

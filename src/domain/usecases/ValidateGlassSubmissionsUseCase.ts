import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { GlassSubmissionsRepository } from "../repositories/GlassSubmissionsRepository";

const glassSubmissions = [
    {
        id: "4663764e-9ca6-4a68-ac49-e0605482384c",
        module: "AVnpk4xiXGG",
        batchId: "Data set 1",
        countryCode: "DZA",
        fileId: "",
        fileName: "DZA2010RIS.txt",
        fileType: "RIS",
        inputLineNb: 250,
        outputLineNb: 100,
        period: "2022Q1",
        specimens: ["Blood", "Stool"],
        status: "Done",
        submissionDate: new Date("2021-01-10T00:00:00.000Z"),
        call: "", //to do
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

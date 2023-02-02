import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { GlassSubmissionsRepository } from "../repositories/GlassSubmissionsRepository";

const submission = {
    id: "ACe2e4xiXG3",
    batchId: "Dataset 1",
    call: "ACndiso120S",
    countryCode: "",
    fileId: "",
    fileName: "test.ris",
    fileType: "RIS",
    inputLineNb: 0,
    outputLineNb: 0,
    module: "AVnpk4xiXGG",
    period: "",
    specimens: [],
    status: "uploaded",
    submissionDate: new Date().toISOString(),
};

export class ValidateGlassSubmissionsUseCase implements UseCase {
    constructor(private glassSubmissionsRepository: GlassSubmissionsRepository) {}

    public execute(): FutureData<void> {
        return this.glassSubmissionsRepository
            .getAll()
            .flatMap(data =>
                data.length === 0 ? this.glassSubmissionsRepository.save(submission) : Future.success(undefined)
            );
    }
}

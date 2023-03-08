import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

const upload = {
    id: "ACe2e4xiXG3",
    batchId: "Dataset 1",
    dataSubmission: "ACndiso120S",
    countryCode: "",
    fileId: "",
    fileName: "test.ris",
    fileType: "RIS",
    inputLineNb: 0,
    outputLineNb: 0,
    module: "AVnpk4xiXGG",
    period: "",
    specimens: [],
    status: "UPLOADED",
    uploadDate: new Date().toISOString(),
    orgUnit: "ACe2e4xiXG2",
};

export class ValidateGlassUploadsUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute(): FutureData<void> {
        return this.glassUploadsRepository
            .getAll()
            .flatMap(data =>
                data.length === 0 ? this.glassUploadsRepository.save(upload) : Future.success(undefined)
            );
    }
}

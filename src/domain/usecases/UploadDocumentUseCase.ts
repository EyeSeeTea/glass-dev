import { UseCase } from "../../CompositionRoot";
import { generateUid } from "../../utils/uid";
import { FutureData } from "../entities/Future";
import { GlassDocumentsRepository } from "../repositories/GlassDocumentsRepository";
import { GlassSubmissionsRepository } from "../repositories/GlassSubmissionsRepository";

export class UploadDocumentUseCase implements UseCase {
    constructor(
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassSubmissionsRepository: GlassSubmissionsRepository
    ) {}

    public execute(file: File): FutureData<void> {
        return this.glassDocumentsRepository.save(file).flatMap(fileId => {
            const submission = {
                id: generateUid(),
                batchId: "Dataset 1",
                call: "",
                countryCode: "",
                fileId,
                fileName: file.name,
                fileType: "RIS",
                inputLineNb: 0,
                outputLineNb: 0,
                module: "",
                period: "",
                specimens: [],
                status: "uploaded",
                submissionDate: new Date().toISOString(),
            };
            return this.glassSubmissionsRepository.save(submission);
        });
    }
}

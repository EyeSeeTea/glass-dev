import { UseCase } from "../../CompositionRoot";
import { generateUid } from "../../utils/uid";
import { FutureData } from "../entities/Future";
import { GlassDocumentsRepository } from "../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class UploadDocumentUseCase implements UseCase {
    constructor(
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository
    ) {}

    public execute(file: File): FutureData<void> {
        return this.glassDocumentsRepository.save(file).flatMap(fileId => {
            const submission = {
                id: generateUid(),
                batchId: "Dataset 1",
                dataSubmission: "",
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
                uploadDate: new Date().toISOString(),
            };
            return this.glassUploadsRepository.save(submission);
        });
    }
}

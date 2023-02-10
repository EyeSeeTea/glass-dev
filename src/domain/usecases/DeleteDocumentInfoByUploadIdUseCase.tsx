import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassDocumentsRepository } from "../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class DeleteDocumentInfoByUploadIdUseCase implements UseCase {
    constructor(
        private glassDocumentsRepository: GlassDocumentsRepository,
        private GlassUploadsRepository: GlassUploadsRepository
    ) {}

    public execute(uploadId: string): FutureData<void> {
        return this.GlassUploadsRepository.resetFileInfo(uploadId).flatMap(documentId => {
            return this.glassDocumentsRepository.delete(documentId);
        });
    }
}
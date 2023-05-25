import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { GlassDocumentsRepository } from "../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class DeleteDocumentInfoByUploadIdUseCase implements UseCase {
    constructor(
        private glassDocumentsRepository: GlassDocumentsRepository,
        private GlassUploadsRepository: GlassUploadsRepository
    ) {}

    public execute(uploadId: string): FutureData<void> {
        return this.GlassUploadsRepository.delete(uploadId).flatMap(uploadFileData => {
            return this.glassDocumentsRepository.delete(uploadFileData.fileId).flatMap(id => {
                return this.glassDocumentsRepository.deleteDocumentApi(id).flatMap(_data => {
                    if (uploadFileData.eventListFileId)
                        return this.glassDocumentsRepository.deleteDocumentApi(uploadFileData.eventListFileId);
                    else return Future.success(undefined);
                });
            });
        });
    }
}

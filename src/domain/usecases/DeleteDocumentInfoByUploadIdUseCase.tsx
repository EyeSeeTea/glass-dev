import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { GlassDocumentsRepository } from "../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class DeleteDocumentInfoByUploadIdUseCase implements UseCase {
    constructor(
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository
    ) {}

    public execute(uploadId: string): FutureData<void> {
        return this.glassUploadsRepository.delete(uploadId).flatMap(uploadFileData => {
            return this.glassDocumentsRepository.delete(uploadFileData.fileId).flatMap(id => {
                return this.glassDocumentsRepository.deleteDocumentApi(id).flatMap(_data => {
                    return Future.joinObj({
                        _eventListFileDeleted: uploadFileData.eventListFileId
                            ? this.glassDocumentsRepository.deleteDocumentApi(uploadFileData.eventListFileId)
                            : Future.success(undefined),
                        _calculatedEventListFileDeleted: uploadFileData.calculatedEventListFileId
                            ? this.glassDocumentsRepository.deleteDocumentApi(uploadFileData.calculatedEventListFileId)
                            : Future.success(undefined),
                    }).flatMap(_result => {
                        return Future.success(undefined);
                    });
                });
            });
        });
    }
}

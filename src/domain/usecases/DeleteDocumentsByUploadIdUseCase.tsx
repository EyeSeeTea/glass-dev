import { UseCase } from "../../CompositionRoot";
import { Id } from "../entities/Base";
import { Future, FutureData } from "../entities/Future";
import { GlassUploads } from "../entities/GlassUploads";
import { GlassDocumentsRepository } from "../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class DeleteDocumentsByUploadIdUseCase implements UseCase {
    constructor(
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository
    ) {}

    public execute(uploadIds: Id[]): FutureData<void> {
        return Future.parallel(
            uploadIds.map(uploadId => {
                return this.glassUploadsRepository.getById(uploadId).flatMap(upload => {
                    return this.glassDocumentsRepository.delete(upload.fileId).flatMap(() => {
                        const uploadWithoutFileId: GlassUploads = { ...upload, fileId: `${upload.fileId}_deleted` };
                        return this.glassUploadsRepository.update(uploadWithoutFileId);
                    });
                });
            })
        ).flatMap(() => Future.success(undefined));
    }
}

import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassDocumentsRepository } from "../repositories/GlassDocumentsRepository";

export class DownloadDocumentUseCase implements UseCase {
    constructor(private glassDocumentsRepository: GlassDocumentsRepository) {}

    public execute(id: string): FutureData<Blob> {
        return this.glassDocumentsRepository.download(id);
    }
}

import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { GlassDocumentsRepository } from "../repositories/GlassDocumentsRepository";

export class DownloadDocumentUseCase implements UseCase {
    constructor(private glassDocumentsRepository: GlassDocumentsRepository) {}

    public execute(id: string): FutureData<Blob> {
        if (id !== "") return this.glassDocumentsRepository.download(id);
        else return Future.error("File id not found");
    }
}

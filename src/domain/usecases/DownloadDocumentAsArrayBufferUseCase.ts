import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { GlassDocumentsRepository } from "../repositories/GlassDocumentsRepository";

export class DownloadDocumentAsArrayBufferUseCase implements UseCase {
    constructor(private glassDocumentsRepository: GlassDocumentsRepository) {}

    public execute(id: string): FutureData<ArrayBuffer> {
        if (id !== "") return this.glassDocumentsRepository.download(id).flatMap(blob => fromBlobToArrayBuffer(blob));
        else return Future.error("File id not found");
    }
}

function fromBlobToArrayBuffer(blob: Blob): FutureData<ArrayBuffer> {
    return Future.fromPromise(blob.arrayBuffer());
}

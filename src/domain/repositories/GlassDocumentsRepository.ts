import { FutureData } from "../entities/Future";
import { GlassDocuments } from "../entities/GlassDocuments";

export interface GlassDocumentsRepository {
    getAll(): FutureData<GlassDocuments[]>;
    save(file: File, module: string): FutureData<string>;
    delete(id: string): FutureData<string>;
    download(id: string): FutureData<Blob>;
    deleteDocumentApi(id: string): FutureData<void>;
}

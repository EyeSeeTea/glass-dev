import { FutureData } from "../entities/Future";
import { GlassDocuments } from "../entities/GlassDocuments";

export interface GlassDocumentsRepository {
    getAll(): FutureData<GlassDocuments[]>;
    save(file: File): FutureData<string>;
}

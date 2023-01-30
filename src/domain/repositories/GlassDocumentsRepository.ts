import { FutureData } from "../entities/Future";
import { GlassDocuments } from "../entities/GlassDocuments";

export interface GlassDocumentsRepository {
    getAll(): FutureData<GlassDocuments[]>;
    save(Documents: GlassDocuments[]): FutureData<void>;
}

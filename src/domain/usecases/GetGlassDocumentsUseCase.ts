import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassDocuments } from "../entities/GlassDocuments";
import { GlassDocumentsRepository } from "../repositories/GlassDocumentsRepository";

export class GetGlassDocumentsUseCase implements UseCase {
    constructor(private glassDocumentsRepository: GlassDocumentsRepository) {}

    public execute(): FutureData<GlassDocuments[]> {
        return this.glassDocumentsRepository.getAll();
    }
}

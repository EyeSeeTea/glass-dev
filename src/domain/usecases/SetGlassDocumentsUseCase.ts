import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassDocuments } from "../entities/GlassDocuments";
import { GlassDocumentsRepository } from "../repositories/GlassDocumentsRepository";

export class SetGlassDocumentsUseCase implements UseCase {
    constructor(private glassDocumentsRepository: GlassDocumentsRepository) {}

    public execute(documents: GlassDocuments[]): FutureData<void> {
        return this.glassDocumentsRepository.save(documents);
    }
}

import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { GlassDocumentsRepository } from "../repositories/GlassDocumentsRepository";

const glassDocuments = [
    {
        id: "ABC1234323",
        fileResourceId: "ABC3424123",
        createdAt: new Date().toISOString(),
    },
];

export class ValidateGlassDocumentsUseCase implements UseCase {
    constructor(private glassDocumentsRepository: GlassDocumentsRepository) {}

    public execute(): FutureData<void> {
        return this.glassDocumentsRepository
            .getAll()
            .flatMap(data =>
                data.length === 0 ? this.glassDocumentsRepository.save(glassDocuments) : Future.success(undefined)
            );
    }
}

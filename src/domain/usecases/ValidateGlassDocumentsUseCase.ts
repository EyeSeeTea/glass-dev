import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { GlassDocumentsRepository } from "../repositories/GlassDocumentsRepository";

const file = new File(["foo"], "foo.txt", {
    type: "text/plain",
});

export class ValidateGlassDocumentsUseCase implements UseCase {
    constructor(private glassDocumentsRepository: GlassDocumentsRepository) {}

    public execute(): FutureData<string | undefined> {
        return this.glassDocumentsRepository
            .getAll()
            .flatMap(data =>
                data.length === 0 ? this.glassDocumentsRepository.save(file) : Future.success(undefined)
            );
    }
}

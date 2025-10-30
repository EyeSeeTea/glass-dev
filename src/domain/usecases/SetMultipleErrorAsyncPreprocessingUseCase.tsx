import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class SetMultipleErrorAsyncPreprocessingUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute(uploadIds: Id[], errorMessage?: string): FutureData<void> {
        return this.glassUploadsRepository.setMultipleErrorAsyncPreprocessing(uploadIds, errorMessage);
    }
}

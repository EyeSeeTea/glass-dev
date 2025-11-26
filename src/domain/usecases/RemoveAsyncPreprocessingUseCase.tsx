import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { AsyncPreprocessingRepository } from "../repositories/AsyncPreprocessingRepository";

export class RemoveAsyncPreprocessingUseCase implements UseCase {
    constructor(private asyncPreprocessingRepository: AsyncPreprocessingRepository) {}

    public execute(uploadIdsToRemove: Id[]): FutureData<void> {
        return this.asyncPreprocessingRepository.remove(uploadIdsToRemove);
    }
}

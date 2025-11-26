import { UseCase } from "../../CompositionRoot";
import { AsyncPreprocessingStatus } from "../entities/AsyncPreprocessing";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { AsyncPreprocessingRepository } from "../repositories/AsyncPreprocessingRepository";

export class SetAsyncPreprocessingStatusUseCase implements UseCase {
    constructor(private asyncPreprocessingRepository: AsyncPreprocessingRepository) {}

    public execute(uploadId: Id, status: AsyncPreprocessingStatus): FutureData<void> {
        return this.asyncPreprocessingRepository.updateStatus(uploadId, status);
    }
}

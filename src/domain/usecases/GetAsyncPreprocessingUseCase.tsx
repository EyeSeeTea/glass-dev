import { UseCase } from "../../CompositionRoot";
import { AsyncPreprocessing } from "../entities/AsyncPreprocessing";
import { FutureData } from "../entities/Future";
import { AsyncPreprocessingRepository } from "../repositories/AsyncPreprocessingRepository";

export class GetAsyncPreprocessingUseCase implements UseCase {
    constructor(private asyncPreprocessingRepository: AsyncPreprocessingRepository) {}

    public execute(): FutureData<AsyncPreprocessing[]> {
        return this.asyncPreprocessingRepository.getAll();
    }
}
